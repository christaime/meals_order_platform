package com.mealmarket.ai.application.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mealmarket.ai.application.dto.*;
import com.mealmarket.ai.application.exception.LlmException;
import com.mealmarket.ai.application.port.LlmClient;
import com.mealmarket.ai.application.port.StructuredPayloadManager;
import com.mealmarket.ai.application.port.StructuredPayloadManagerFactory;
import com.mealmarket.ai.application.tool.ToolContext;
import com.mealmarket.ai.application.tool.ToolRegistry;
import com.mealmarket.ai.application.tool.ToolResult;
import com.mealmarket.ai.domain.model.ChatSession;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * The MealMate agent loop.
 *
 * Flow:
 *   1. Ensure a session exists (create or continue).
 *   2. Persist the incoming user turn.
 *   3. Build the LLM context: SYSTEM + full history.
 *   4. Loop up to MAX_ITERATIONS:
 *        a. Call the LLM with the current context + tool catalogue.
 *        b. If the LLM returned tool calls:
 *             - execute each tool deterministically in Java
 *             - hand any UI payload to the {@link StructuredPayloadManager}
 *             - persist the assistant tool-call turn (no payload)
 *             - persist one TOOL message per tool result (no payload)
 *             - append them to the in-memory context
 *             - continue the loop
 *           Else (no tool calls):
 *             - the LLM is done; persist the final assistant reply
 *               WITH the accumulated UI payloads, if any
 *             - return
 *   5. Return.
 *
 * Payload rule:
 *   A {@link StructuredPayload} is a UI artifact. It is NEVER added to
 *   the LLM context and NEVER persisted on intermediate turns. It
 *   rides alongside the conversation and is written only on the final
 *   assistant turn, so history reloads can re-render the cards.
 *   Merging, deduplication and ordering of payloads of the same type
 *   are the responsibility of the {@link StructuredPayloadManager}.
 *
 * MAX_ITERATIONS guards against an LLM that keeps calling tools
 * forever. If we exit the loop without a final reply, we return a
 * graceful fallback instead of a 500.
 *
 * The LLM NEVER writes to the database directly. Every write goes
 * through a tool, executed deterministically in Java.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AgentOrchestrator {

    private static final int MAX_ITERATIONS = 8;

    private final LlmClient llmClient;
    private final ConversationStore conversationStore;
    private final PromptBuilder promptBuilder;
    private final ToolRegistry toolRegistry;
    private final StructuredPayloadManagerFactory payloadManagerFactory;
    private final ObjectMapper objectMapper;

    // ═══════════════════════════════════════════════════════════
    //  Entry point
    // ═══════════════════════════════════════════════════════════

    public ChatResponse handle(ChatRequest request, String userId, String userType, String locale) {
        UUID userUuid = parseUuid(userId);

        // 1. Session
        ChatSession session = conversationStore.getOrCreateSession(
                request.sessionId(), userUuid, userType);

        // 2. Persist the incoming user turn (no payload — user turns never carry one)
        conversationStore.append(
                session.getId(),
                LlmMessage.user(request.message()),
                List.of());

        // 3. Build the initial context
        List<LlmMessage> context = new ArrayList<>();
        context.add(LlmMessage.system(promptBuilder.buildSystemPrompt(locale)));
        context.addAll(conversationStore.loadHistory(session.getId()));

        ToolContext toolContext = new ToolContext(
                userUuid,
                userType,
                locale,
                session.getId()
        );

        // 4. Loop — the loop persists every turn as it goes, including
        //    the final assistant reply, so the caller just gets the result.
        ToolLoopResult result = runToolLoop(context, toolContext, session.getId());

        log.info("[MealMate] chat turn finished session={} payloadTypes={} replyLen={}",
                session.getId(),
                result.payloads().stream().map(StructuredPayload::type).toList(),
                result.reply() != null ? result.reply().length() : 0);

        return ChatResponse.withStructured(result.reply(), session.getId().toString(), result.payloads());
    }

    // ═══════════════════════════════════════════════════════════
    //  The loop
    // ═══════════════════════════════════════════════════════════

    /**
     * Runs the tool loop until the LLM produces a final text reply,
     * the iteration budget runs out, or the LLM errors out.
     *
     * A fresh {@link StructuredPayloadManager} is created per turn so
     * the collector is never shared across concurrent requests.
     *
     * Every turn is persisted inside the loop, including the final
     * assistant reply. The returned {@link ToolLoopResult} carries
     * the reply text and any UI payloads the caller should surface.
     */
    private ToolLoopResult runToolLoop(
            List<LlmMessage> context,
            ToolContext toolContext,
            UUID sessionId
    ) {
        StructuredPayloadManager payloadManager = payloadManagerFactory.create();

        for (int iteration = 0; iteration < MAX_ITERATIONS; iteration++) {

            LlmResponse response;
            try {
                response = llmClient.complete(context, toolRegistry.allDefinitions());
            } catch (LlmException e) {
                log.error("[MealMate] LLM call failed for session {}: {}",
                        sessionId, e.getMessage());
                return finishWithFallback(
                        sessionId,
                        "Désolé, je ne peux pas répondre pour le moment. "
                                + "Veuillez réessayer dans un instant.");
            }

            // ── Case A: no tool calls → the LLM is done ──
            if (!response.hasToolCalls()) {
                String content = response.content();

                if (content == null || content.isBlank()) {
                    // Distinguish "model ran out of budget" from "model returned nothing"
                    if (response.usage() != null
                            && response.usage().completionTokens() > 0
                            && content == null) {
                        log.warn("[MealMate] empty content with {} completion tokens — "
                                        + "likely reasoning model hit token limit",
                                response.usage().completionTokens());
                        return finishWithFallback(
                                sessionId,
                                "Je n'arrive pas à répondre pour le moment. "
                                        + "Réessayez, ou reformulez votre question autrement.");
                    }

                    log.warn("[MealMate] LLM returned empty content for session {}", sessionId);
                    return finishWithFallback(sessionId, "Pouvez-vous reformuler ?");
                }

                // Persist the final assistant reply WITH the accumulated payloads.
                List<StructuredPayload> payloads = payloadManager.finish();
                conversationStore.append(
                        sessionId,
                        LlmMessage.assistant(content),
                        payloads);

                return new ToolLoopResult(content, payloads);
            }

            // ── Case B: tool calls → execute, append, loop ──
            log.info("[MealMate] session {} iteration {}: {} tool call(s)",
                    sessionId, iteration, response.toolCalls().size());

            LlmMessage assistantTurn = LlmMessage.assistantWithToolCalls(response.toolCalls());
            conversationStore.append(sessionId, assistantTurn, List.of());
            context.add(assistantTurn);

            for (LlmToolCall call : response.toolCalls()) {
                ToolResult result = executeTool(call, toolContext);

                // The payload is a UI artifact. It rides alongside the
                // conversation and is NOT added to the context — the LLM
                // never sees it. The manager handles merging and dedupe.
                if (result.structured() != null) {
                    payloadManager.add(result.structured());
                }

                String resultJson = serializeToolResult(call.name(), result);

                LlmMessage toolTurn = LlmMessage.tool(call.id(), resultJson);
                conversationStore.append(sessionId, toolTurn, List.of());
                context.add(toolTurn);

                log.debug("[MealMate] tool {} returned success={} for call {}",
                        call.name(), result.success(), call.id());
            }
        }

        log.warn("[MealMate] session {} exceeded {} iterations without a final reply",
                sessionId, MAX_ITERATIONS);
        return finishWithFallback(
                sessionId,
                "Je suis désolé, je n'arrive pas à terminer cette demande. "
                        + "Pouvez-vous la reformuler plus simplement ?");
    }

    /**
     * Persists a system-generated fallback reply as the final
     * assistant turn and returns it. No payload — fallbacks are
     * plain text.
     */
    private ToolLoopResult finishWithFallback(UUID sessionId, String reply) {
        conversationStore.append(sessionId, LlmMessage.assistant(reply), List.of());
        return new ToolLoopResult(reply, List.of());
    }

    // ═══════════════════════════════════════════════════════════
    //  Tool execution
    // ═══════════════════════════════════════════════════════════

    private ToolResult executeTool(LlmToolCall call, ToolContext toolContext) {
        Map<String, Object> args = call.arguments() != null
                ? call.arguments()
                : Map.of();

        try {
            return toolRegistry.execute(call.name(), args, toolContext);
        } catch (Exception e) {
            log.error("[MealMate] tool '{}' threw unexpectedly: {}",
                    call.name(), e.getMessage(), e);
            return ToolResult.failure(
                    "The tool '" + call.name() + "' failed unexpectedly. "
                            + "Tell the user there was a technical issue and suggest they try again."
            );
        }
    }

    /**
     * Serializes a tool result into a JSON string for the LLM.
     *
     * The LLM sees this verbatim as the `content` of a TOOL message.
     * The {@code structured} field is intentionally omitted — it is a
     * UI artifact, not something the model should reason about.
     */
    private String serializeToolResult(String toolName, ToolResult result) {
        try {
            return objectMapper.writeValueAsString(Map.of(
                    "success", result.success(),
                    "message", result.message(),
                    "data", result.data() != null ? result.data() : Map.of()
            ));
        } catch (Exception e) {
            log.error("[MealMate] failed to serialize result of tool {}: {}",
                    toolName, e.getMessage(), e);
            return "{\"success\":false,\"message\":\"Serialization failure\",\"data\":{}}";
        }
    }

    // ═══════════════════════════════════════════════════════════
    //  Helpers
    // ═══════════════════════════════════════════════════════════

    private UUID parseUuid(String raw) {
        if (raw == null || raw.isBlank()) return null;
        try {
            return UUID.fromString(raw);
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    /**
     * Result of a completed tool loop: the reply text the user sees,
     * and any UI payloads that should be attached to the final
     * assistant turn. {@code payloads} is never null.
     */
    private record ToolLoopResult(String reply, List<StructuredPayload> payloads) {}
}