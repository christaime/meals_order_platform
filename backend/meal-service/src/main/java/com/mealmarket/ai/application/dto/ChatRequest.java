package com.mealmarket.ai.application.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Incoming chat message from a user or anonymous visitor.
 *
 * sessionId:
 *   - null or blank → the server creates a new session and returns its id
 *   - non-null      → continue the existing session
 */
public record ChatRequest(

        @NotBlank(message = "Message is required")
        @Size(max = 2000, message = "Message cannot exceed 2000 characters")
        String message,

        String sessionId
) {}