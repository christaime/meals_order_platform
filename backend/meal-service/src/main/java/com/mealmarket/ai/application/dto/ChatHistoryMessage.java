package com.mealmarket.ai.application.dto;

import java.time.Instant;
import java.util.List;

public record ChatHistoryMessage(
        String id,
        String role,               // "user" | "assistant"
        String content,
        Instant createdAt,
        List<StructuredPayload> structured
) {}