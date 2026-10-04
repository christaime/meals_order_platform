# MealMate — Architecture

## 1. Context

MealMate is a module of the MealMarket backend, a Spring Boot 3.2 /
Java 17 modular monolith with an Angular 19 frontend.

```
┌────────────────┐    HTTPS    ┌─────────────────────────┐
│  Angular app   │ ──────────► │  Spring Boot backend    │
│  (chat widget) │             │  /api/v1/ai/**          │
└────────────────┘             └──────────┬──────────────┘
│
┌──────────────────┼──────────────────┐
│                  │                  │
▼                  ▼                  ▼
┌──────────┐      ┌────────────┐    ┌─────────────┐
│ Postgres │      │ LLM (Groq) │    │ MealMarket  │
│ chat +   │      │            │    │ domain      │
│ meals    │      └────────────┘    │ (services)  │
└──────────┘                        └─────────────┘
```

## 2. Module layout

```
com.mealmarket.ai/
├── application/
│   ├── dto/                    wire types (ChatRequest, ChatResponse, …)
│   │   └── payload/            payload DTOs (MealListPayload, …)
│   ├── port/                   LlmClient, StructuredPayloadManager…
│   ├── service/                AgentOrchestrator, ChatHistoryService
│   └── tool/                   Tool interface, ToolRegistry, ToolResult
├── domain/model/               ChatSession
└── infrastructure/
├── llm/                    LlmClient implementations, PromptBuilder
├── persistence/            entity, repository, mapper, adapter
├── tool/                   one class per tool + payload manager
└── web/                    ChatController
```

The orchestrator depends on ports and interfaces only. Everything
provider-specific or persistence-specific lives in `infrastructure`.

## 3. The agent loop

Each turn:

```
1. Resolve or create the session (getOrCreateSession).
2. Persist the incoming user turn.
3. Build the LLM context:
   [SYSTEM prompt] + [full sanitized history]
4. Loop up to MAX_ITERATIONS (8):
   a. Call the LLM with the context + tool catalogue.
   b. If no tool calls → the LLM is done.
   - Persist the final assistant turn with the accumulated
   UI payloads.
   - Return.
   c. If tool calls → execute each tool in Java.
   - Persist the assistant-with-tool-calls turn (no payload).
   - Persist one TOOL message per result (no payload).
   - Hand any StructuredPayload to the payload manager.
   - Append all turns to the context.
   - Continue.
5. If the loop runs out of iterations, persist a graceful fallback
   and return it.
```

The loop is bounded so a misbehaving LLM cannot stall a request.
The persisted history is the same context the loop rebuilds on the
next turn, so a reload resumes cleanly.

## 4. The payload rule

A `StructuredPayload` is a UI artifact produced by a tool for the
frontend. It has two invariants:

1. **It is never shown to the LLM.** It is not placed in the
   context, and it is not part of any `ToolResult.message`. The
   model must reason about the underlying data (which it receives
   as `ToolResult.data`), not about the presentation shape.
2. **It is written only to the final assistant turn.** Intermediate
   turns (user, assistant-with-tool-calls, TOOL) carry an empty
   list. The payload is attached when the loop terminates with a
   natural-language reply.

Merging, deduping, and ordering of payloads is the responsibility
of `StructuredPayloadManager`. The orchestrator treats it as an
opaque collector: `add(payload)` per tool result, `finish()` at the
end of the turn.

The default manager (`MealStructuredPayloadManager`) merges
same-type payloads by id and keeps different types side by side in
tool-call order. It knows the two payload types and their array
key. Adding a new type is a one-line change there and nowhere
else.

## 5. Tools

A tool is a Java class that implements:

```java
public interface Tool {
    ToolDefinition definition();
    ToolResult execute(Map<String, Object> args, ToolContext ctx);
}
```

`ToolRegistry` auto-collects all `Tool` beans and exposes them to
the LLM as an OpenAI-style function catalogue. `ToolRegistry.execute`
dispatches by name and never throws — an exception inside a tool is
wrapped in `ToolResult.failure(...)`, which the LLM sees as a
normal result.

Current tools:

| Tool                | Purpose                                          |
|---------------------|--------------------------------------------------|
| `resolveCategory`   | Free-text category → category ids                |
| `resolveIngredient` | Free-text ingredient → ingredient ids            |
| `resolveLocation`   | Free-text place → location ids and cities        |
| `resolveVendor`     | Vendor name or city → vendor cards               |
| `searchMeals`       | Meal search from resolved ids and filters        |
| `getMealDetails`    | One meal with pickup locations and ingredients   |

Resolvers exist so the LLM never invents ids. Every filter the LLM
applies must reference an id that came back from a resolver in the
same or an earlier turn.

## 6. Determinism and safety

The LLM decides *what to look for*. Java decides *what is visible*.

- Only meals with `moderationStatus = APPROVED`, `isAvailable = true`,
  and vendor state `ACTIVE` are returned. Enforced in the service
  layer, not in the prompt.
- Allergen filtering is applied in Java. The prompt asks the model
  to pass an `excludeIngredientIds` list; the specification turns
  that into a SQL predicate. If the model forgets, the filter is
  missing, not wrong — an important distinction. A future phase
  adds a server-side default from the customer's profile.
- The LLM never writes to the database. Write tools are not in the
  catalogue.

## 7. Session lifecycle

Sessions are rows in `ai_chat_session`. Messages are rows in
`ai_chat_message`. Both are created lazily on the first turn.

Rules:

- Every session has an id (UUID). Anonymous or user-bound.
- The frontend stores the current session id in `localStorage`.
  All tabs of the same browser share it.
- A session starts anonymous (`user_id IS NULL`).
- When an authenticated request arrives carrying an anonymous
  session id, the session is **claimed**: `user_id` is set. Its
  messages are preserved.
- If the authenticated user already has a session, the anonymous
  session's messages are **re-parented** to it and the anonymous
  session is deleted. One user, one session.
- If the incoming id belongs to a different user, it is ignored
  and the caller's own session (or a fresh one) is used.

`ai_chat_message.session_id` has `ON DELETE CASCADE` on the session
FK, but the merge path never relies on it: messages are re-parented
*before* the source session is deleted.

## 8. History pagination

The read endpoint pages by cursor:

```
GET /api/v1/ai/chat/{sessionId}/messages?beforeId=&limit=10
```

- `beforeId` omitted → latest page.
- `beforeId` present → messages strictly older than that message.
- Response is ascending (oldest first) with `hasMore` and a
  `nextCursor`.

The server resolves the cursor to a `(created_at, id)` tuple and
filters on it. Two SQL queries back this: `findLatestPage` and
`findPageBefore`. They are split, not unified with an `IS NULL`
branch, because PostgreSQL cannot infer the type of a bound
parameter used inside `? IS NULL`.

Visible history excludes `TOOL` rows and assistant rows that only
carry tool calls, so the UI never shows protocol noise.

## 9. LLM provider

`LlmClient` is the only provider-facing abstraction:

```java
public interface LlmClient {
    LlmResponse complete(List<LlmMessage> messages,
                         List<ToolDefinition> tools);
}
```

Implementations exist for OpenAI-compatible endpoints. The
recommended free-tier provider is Groq
(`llama-3.3-70b-versatile` or `openai/gpt-oss-120b`). OpenRouter
free tier is supported but rate-limited. Gemini is supported in
principle but requires thought-signature handling on tool calls.

Switching providers requires only a new `LlmClient` bean and a
property change.

## 10. Frontend

The chat widget is a standalone Angular 19 component mounted
globally (`<app-chat-widget />`). It is present on every route.

State:

- Session id and panel open/closed state → `localStorage`.
- Conversation turns → in-memory `signal`, hydrated from the
  history endpoint on first open.
- Pagination cursors → in-memory.

Rendering:

- Turn bubbles render text and, if present, structured cards.
- Cards are dedicated components (`chat-meal-card`,
  `chat-vendor-card`).
- Payload types are a discriminated union in TypeScript so a
  mismatch between wire format and render code is a compile error.

Scroll behaviour:

- Auto-scroll on new turns (append), not on prepended history.
- The widget anchors the viewport when an older page is prepended,
  so the user does not get yanked.
- A "jump to latest" affordance appears when the user has scrolled
  away from the bottom.

## 11. Persistence schema

Two tables.

`ai_chat_session`:

| Column            | Type        | Notes                       |
|-------------------|-------------|-----------------------------|
| `id`              | uuid        | PK                          |
| `user_id`         | uuid        | null for anonymous          |
| `user_type`       | varchar(20) | CUSTOMER / VENDOR / ADMIN   |
| `started_at`      | timestamptz |                             |
| `last_message_at` | timestamptz | updated on append           |
| `message_count`   | int         | total rows, including TOOL  |
| `status`          | varchar(20) | ACTIVE / ARCHIVED / …       |
| `allergens`       | jsonb       | reserved for customer scope |
| `archive_ref`     | varchar     | reserved for archival       |
| `archived_at`     | timestamptz | reserved                    |
| `purged_at`       | timestamptz | reserved                    |

`ai_chat_message`:

| Column              | Type        | Notes                                |
|---------------------|-------------|--------------------------------------|
| `id`                | uuid        | PK                                   |
| `session_id`        | uuid        | FK → session, ON DELETE CASCADE      |
| `role`              | varchar(20) | USER / ASSISTANT / SYSTEM / TOOL     |
| `content`           | text        |                                      |
| `tool_calls`        | jsonb       | assistant tool-call requests         |
| `metadata`          | jsonb       | tool_call_id, latency, etc.          |
| `structured_payload`| jsonb       | array of StructuredPayload, nullable |
| `created_at`        | timestamptz |                                      |

Index for pagination:

```sql
CREATE INDEX idx_ai_chat_message_session_created_id
    ON ai_chat_message (session_id, created_at DESC, id DESC);
```

## 12. What is not built yet

- Deterministic allergen guardrails from a customer profile
  (needs a `Customer` entity).
- Order placement tools (`createOrder`, `checkAvailability`,
  `getCustomerProfile`).
- Streaming responses.
- Audit log (`ai_audit_log`).
- Conversation archival job (90-day retention).
- Automated end-to-end tests.

Each of these is listed here so a reader of the code does not
assume they exist.
```

---

Two notes on what I changed from the earlier draft, since you asked for a regeneration rather than a diff:

- **The `infrastructure/llm/` line no longer names `OpenRouterClient` or `GeminiClient`.** It reads "LlmClient implementations" so the doc doesn't go stale when you swap providers. §9 still recommends Groq concretely.
- **The `infrastructure/config/` line was dropped.** It never carried meaningful content and the reader can discover config through the tool's own imports.

Everything else — the loop, the payload rule, the tool table, the session lifecycle, the pagination reasoning, the schema — is stable and reflects the code we actually built.