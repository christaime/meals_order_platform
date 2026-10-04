package com.mealmarket.ai.application.dto;

import java.util.List;
import java.util.Map;

/**
 * Response envelope for one chat turn.
 *
 * Phase 1:  reply = echo of the user message.
 * Phase 2+: reply = LLM text.
 *
 * Phase 3+: the optional {@code structured} field carries meal cards,
 * meal details, or order confirmations so the frontend can render
 * them without parsing the LLM's prose.
 */
public record ChatResponse(
        String reply,
        String sessionId,
        List<StructuredPayload> structured
) {

    /** No structured payload. */
    public static ChatResponse text(String reply, String sessionId) {
        return new ChatResponse(reply, sessionId, null);
    }

    public static ChatResponse withStructured(
            String reply,
            String sessionId,
            List<StructuredPayload> structured
    ) {
        return new ChatResponse(reply, sessionId, structured);
    }

}