package com.mealmarket.ai.application.tool;

import com.mealmarket.ai.application.dto.ChatResponse;
import com.mealmarket.ai.application.dto.StructuredPayload;

import java.util.List;
import java.util.Map;

/**
 * A tool's response, in a form the LLM understands.
 *
 * {@code success}: whether the tool completed. Errors are returned as
 * {@code ToolResult.failure(...)}, not thrown — the LLM should see the
 * error and adapt, not have the whole request blow up.
 *
 * {@code data}: the payload. Small JSON-friendly structures only —
 * meal summaries, location summaries, counts. Never JPA entities.
 *
 * {@code attachments}: optional structured objects the frontend may
 * render (e.g. meal cards). Not used in Phase 3, planned for Phase 8.
 */
public record ToolResult(
        boolean success,
        String message,
        Map<String, Object> data,
        StructuredPayload structured
) {

    public static ToolResult success(String message, Map<String, Object> data) {
        return new ToolResult(true, message, data,null);
    }

    public static ToolResult failure(String message) {
        return new ToolResult(false, message, Map.of(), null);
    }

    public static ToolResult successWithStructured(
            String message,
            Map<String, Object> data,
            StructuredPayload structured
    ) {
        return new ToolResult(true, message, data, structured);
    }

}