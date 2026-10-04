package com.mealmarket.ai.application.dto;

import com.mealmarket.ai.application.dto.LlmToolCall;

import java.util.List;

/**
 * One turn in a conversation.
 *
 * Phase 3 adds:
 *   - role TOOL (a tool's result, addressed to the assistant)
 *   - assistant messages that carry tool calls instead of (or in
 *     addition to) text
 */
public record LlmMessage(
        Role role,
        String content,
        List<LlmToolCall> toolCalls,
        String toolCallId
) {
    public enum Role { SYSTEM, USER, ASSISTANT, TOOL }

    public static LlmMessage system(String content) {
        return new LlmMessage(Role.SYSTEM, content, null, null);
    }
    public static LlmMessage user(String content) {
        return new LlmMessage(Role.USER, content, null, null);
    }
    public static LlmMessage assistant(String content) {
        return new LlmMessage(Role.ASSISTANT, content, null, null);
    }
    public static LlmMessage assistantWithToolCalls(List<LlmToolCall> toolCalls) {
        return new LlmMessage(Role.ASSISTANT, null, toolCalls, null);
    }
    public static LlmMessage tool(String toolCallId, String content) {
        return new LlmMessage(Role.TOOL, content, null, toolCallId);
    }
}