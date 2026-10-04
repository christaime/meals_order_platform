# MealMate — Requirements

## 1. Purpose

MealMate is the conversational ordering agent of MealMarket, a
multi-vendor meal marketplace. It lets customers find meals and
vendors through natural-language conversation instead of navigating
filters, forms and lists.

This document captures the functional and non-functional
requirements for MealMate. It is the source of truth for what the
agent must do. Design and implementation live in `architecture.md`
and `api-contract.md`.

## 2. Scope

In scope (current):

- Natural-language search for meals and vendors.
- Grounded answers built only from real MealMarket data.
- Multi-turn conversations with persistent history.
- Anonymous use, with optional account binding.
- Structured UI payloads (meal cards, vendor cards) alongside the
  textual reply.
- Deterministic enforcement of visibility rules (moderation,
  availability, vendor state).

Out of scope (current):

- Order placement and payment.
- Customer profile and dietary preferences.
- Multi-vendor orders.
- Voice input, image input, streaming responses.
- Any action that writes to the marketplace.

## 3. Users

| Persona    | Needs |
|------------|-------|
| Customer   | Find meals, compare, understand where to pick up |
| Anonymous  | Same as customer, without signing in |
| Vendor     | Not a MealMate user yet; may be surfaced by the agent |
| Admin      | Not a MealMate user yet |

## 4. Functional requirements

### FR-1 — Conversation

- FR-1.1 The agent accepts free-form text input in French.
- FR-1.2 The agent answers in French.
- FR-1.3 The agent handles multi-turn conversations: references to
  previous turns resolve correctly ("celui-là", "chez eux").
- FR-1.4 The agent does not greet on continuation turns.
- FR-1.5 A session persists across page reloads for the same
  browser.
- FR-1.6 Anonymous sessions are supported. A conversation can start
  before sign-in.
- FR-1.7 When a user signs in mid-conversation, the anonymous
  session is bound to that user. One authenticated user has exactly
  one session.

### FR-2 — Meal search

- FR-2.1 The agent finds meals by name, category, ingredient,
  vendor, price range, rating, preparation time, and pickup
  location.
- FR-2.2 Category, ingredient and location terms are resolved
  against real MealMarket data before search. The agent never
  invents identifiers.
- FR-2.3 Only meals with `moderationStatus = APPROVED`,
  `isAvailable = true`, and a vendor in `ACTIVE` state are visible.
  This rule is enforced in Java, never by the LLM.
- FR-2.4 When several search calls are needed in a single turn
  (e.g. two different dishes), the results are merged and deduped
  by meal id, in tool-call order.

### FR-3 — Meal details

- FR-3.1 The agent can return the full details of one meal:
  description, price, image, ingredients (with allergens), pickup
  locations (with address and city), vendor name.
- FR-3.2 Meal details are only returned for meals visible per
  FR-2.3.

### FR-4 — Vendor search

- FR-4.1 The agent can list vendors by name or by city.
- FR-4.2 The agent can return the full details of one vendor:
  name, description, address, city, image, rating.
- FR-4.3 A vendor is visible only if its state is `ACTIVE`.

### FR-5 — Structured payloads

- FR-5.1 When the agent presents meals or vendors, the response
  carries a structured payload the UI renders as cards.
- FR-5.2 Payload types are `MEALS` and `VENDORS`. Each carries an
  array of cards.
- FR-5.3 Multiple payloads of the same type in one turn are merged
  and deduped by id.
- FR-5.4 The structured payload is never shown to the LLM. It is
  a UI-only artifact.
- FR-5.5 The structured payload is persisted with the final
  assistant turn, so it is restored on history reload.

### FR-6 — History

- FR-6.1 The client can page backwards through a session's visible
  history.
- FR-6.2 Tool protocol rows (assistant tool-call requests and TOOL
  responses) are not exposed in the visible history.
- FR-6.3 Pagination is by cursor: "give me messages older than
  message X". No timestamps on the wire.
- FR-6.4 Each visible message carries its own structured payload if
  it had one.

### FR-7 — Safety

- FR-7.1 Allergen filtering is deterministic. A filter supplied by
  the user (e.g. "sans arachide") is honored in Java.
- FR-7.2 The LLM never writes to the database.
- FR-7.3 The LLM never invents identifiers. It uses only ids
  returned by resolver tools.
- FR-7.4 When a tool fails or returns nothing, the agent says so
  honestly instead of fabricating a result.

## 5. Non-functional requirements

### NFR-1 — Language and locale

- French (fr) for all user-facing text.
- Currency displayed as XAF (FCFA).

### NFR-2 — Performance

- A search-meals turn completes in under 10 seconds on a free-tier
  LLM provider.
- History pagination returns within 500 ms for sessions up to 500
  messages.

### NFR-3 — Cost

- The system runs on free-tier infrastructure for demonstration.
- The LLM provider must be free-tier or free-trial.

### NFR-4 — Reliability

- A transient LLM failure produces a friendly French fallback,
  never a 500 to the user.
- Session persistence survives a backend restart.
- The conversation is never lost on page reload.

### NFR-5 — Provider independence

- The LLM provider is behind an interface. Swapping providers
  requires no change outside the client implementation.

### NFR-6 — Observability

- Each turn logs: session id, payload types produced, reply
  length, iteration count.
- LLM errors are logged with the failing session id.

## 6. Acceptance criteria (walkthrough)

The following conversation must work end-to-end:

1. User (anonymous) opens the chat widget.
2. "Hé, salut !" → agent greets and asks what the user wants.
3. "j'aimerais manger des fruits et du taro" → agent asks a
   clarifying question (e.g. which taro dish).
4. "taro sauce jaune, et salade de fruits" → agent presents two
   meal cards, one per dish, in the order the user mentioned them.
5. "où puis-je récupérer le taro ?" → agent returns the meal
   detail for "Taro sauce jaune" with its pickup locations.
6. User reloads the page → the widget reopens with the history
   intact, cards included.
7. User signs in → the same conversation continues; the anonymous
   session is now bound to the user.
8. User closes the browser and returns tomorrow → the widget
   resumes the same session.

## 7. Open questions

- Customer profile and dietary preferences (blocks deterministic
  allergen guardrails).
- Order creation (blocks the end-to-end ordering story).
- Streaming responses (would improve perceived latency).
- Multi-vendor orders (deferred).
- Vendor-facing assistant (deferred).