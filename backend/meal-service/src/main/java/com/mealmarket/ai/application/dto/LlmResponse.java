package com.mealmarket.ai.application.dto;

import java.util.List;

/**
 * The LLM's reply for one turn.
 *
 * Either {@code content} is non-null (a normal assistant message) or
 * {@code toolCalls} is non-empty (the LLM wants a tool executed). Both
 * may be present — the LLM sometimes emits text before a tool call.
 */
public record LlmResponse(
        String content,
        List<LlmToolCall> toolCalls,
        Usage usage
) {
    public boolean hasToolCalls() {
        return toolCalls != null && !toolCalls.isEmpty();
    }

    public record Usage(
            int promptTokens,
            int completionTokens,
            int totalTokens
    ) {
        public static final Usage UNKNOWN = new Usage(-1, -1, -1);
    }
}