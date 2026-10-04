package com.mealmarket.ai.application.dto;

import java.util.List;

public record ChatHistoryResponse(
        String sessionId,
        List<ChatHistoryMessage> messages,   // ascending — oldest first
        boolean hasMore,
        String nextCursor                    // null when hasMore = false
) {}