package com.mealmarket.meal.application.dto;

import com.mealmarket.meal.domain.model.ModerationStatus;
import com.mealmarket.meal.domain.model.ModerationTargetType;
import com.mealmarket.meal.domain.model.UserType;

import java.time.Instant;
import java.util.UUID;

/**
 * Full representation of a single moderation action (audit record).
 */
public record ModerationDataResponse(
        UUID id,
        ModerationTargetType targetType,
        UUID targetId,
        ModerationStatus fromStatus,
        ModerationStatus toStatus,
        String reason,
        UserType performedByType,
        UUID performedById,
        Instant performedAt
) {}