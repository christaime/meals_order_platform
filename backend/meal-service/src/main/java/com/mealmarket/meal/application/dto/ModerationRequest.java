package com.mealmarket.meal.application.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Shared moderation request used by all moderable entities.
 * Handled exclusively by the moderation endpoints.
 */
public record ModerationRequest(

        @NotNull(message = "Moderation decision is required")
        ModerationDecision decision,

        @Size(max = 1000, message = "Reason cannot exceed 1000 characters")
        String reason
) {
    public enum ModerationDecision {
        APPROVE,      // PENDING → APPROVED
        REJECT,       // PENDING → REJECTED
        DISABLE,      // APPROVED → DISABLED
        REACTIVATE,   // DISABLED → APPROVED
        REVOKE        // APPROVED → PENDING (send back for review)
    }
}