package com.mealmarket.ai.application.dto;

import java.util.Map;

public record StructuredPayload(
        String type,
        Map<String, Object> data
) {
    public static StructuredPayload of(String type, Map<String, Object> data) {
        return new StructuredPayload(type, data);
    }
}
