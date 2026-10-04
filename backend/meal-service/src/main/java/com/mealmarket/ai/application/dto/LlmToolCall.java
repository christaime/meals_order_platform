package com.mealmarket.ai.application.dto;

import java.util.Map;

/**
 * A tool invocation requested by the LLM.
 *
 * {@code arguments} is the already-parsed arguments map. The concrete
 * LLM client is responsible for parsing the JSON string OpenRouter
 * returns into a Map before constructing this record.
 */
public record LlmToolCall(
        String id,
        String name,
        Map<String, Object> arguments,
        Map<String, Object> extraContent
) {
    public LlmToolCall(String id, String name, Map<String, Object> arguments) {
        this(id, name, arguments, null);
    }
}