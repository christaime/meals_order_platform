package com.mealmarket.ai.application.tool;

import java.util.Map;

/**
 * Metadata describing a tool to the LLM.
 *
 * Maps 1:1 to OpenAI's `tools[].function` shape. The JSON schema for
 * {@code parameters} is built with plain Maps — no JSON schema library
 * needed for the small schemas we have.
 */
public record ToolDefinition(
        String name,
        String description,
        Map<String, Object> parameters
) {
    public ToolDefinition {
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("Tool name is required");
        }
        if (description == null || description.isBlank()) {
            throw new IllegalArgumentException("Tool description is required");
        }
    }
}