package com.mealmarket.ai.application.tool;

import java.util.UUID;

/**
 * Per-request context available to every tool.
 *
 * Tools must not reach into SecurityContextHolder, request-scoped beans,
 * or the DB for identity. Everything identity-related comes from here.
 */
public record ToolContext(
        UUID userId,
        String userType,
        String locale,
        UUID sessionId
) {
    public boolean isAuthenticated() {
        return userId != null;
    }
}