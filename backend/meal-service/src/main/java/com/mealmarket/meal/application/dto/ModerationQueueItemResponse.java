package com.mealmarket.meal.application.dto;

import com.mealmarket.meal.domain.model.ModerationStatus;
import com.mealmarket.meal.domain.model.ModerationTargetType;
import com.mealmarket.meal.domain.model.UserType;

import java.time.Instant;
import java.util.UUID;

/**
 * A single item in the moderation queue.
 * Used by the admin dashboard to list pending content across all moderable types.
 *
 * The {@code displayName} is a human-friendly identifier (e.g., the meal name,
 * ingredient name, location name). It is filled by the moderation service,
 * which knows how to resolve the target entity.
 */
public record ModerationQueueItemResponse(
        ModerationTargetType targetType,
        UUID targetId,
        String displayName,
        ModerationStatus status,
        UserType createdByType,
        UUID createdById,
        Instant createdAt,
        Instant updatedAt
) {}