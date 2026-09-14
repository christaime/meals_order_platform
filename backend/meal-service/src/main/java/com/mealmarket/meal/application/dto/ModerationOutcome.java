package com.mealmarket.meal.application.dto;

import com.mealmarket.meal.domain.model.ModerationStatus;
import com.mealmarket.meal.domain.model.ModerationTargetType;
import com.mealmarket.meal.domain.model.UserType;

import java.time.Instant;
import java.util.UUID;

/**
 * Lightweight outcome of a moderation action.
 * Returned by the generic {@code moderate(...)} entry point.
 */
public record ModerationOutcome(
        ModerationTargetType targetType,
        UUID targetId,
        ModerationStatus fromStatus,
        ModerationStatus toStatus,
        UserType performedByType,
        UUID performedById,
        Instant performedAt
) {}