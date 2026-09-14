package com.mealmarket.meal.application.dto;

import com.mealmarket.meal.domain.model.ModerationStatus;
import com.mealmarket.meal.domain.model.ModerationTargetType;
import com.mealmarket.meal.domain.model.UserType;

import java.time.Instant;
import java.util.UUID;

/**
 * Lightweight moderation record for lists and activity feeds.
 *
 * Omits the full {@code fromStatus} and {@code performedById} to keep
 * the payload small — clients who need full details use
 * {@link ModerationDataResponse}.
 */
public record ModerationSummaryResponse(
        UUID id,
        ModerationTargetType targetType,
        UUID targetId,
        ModerationStatus toStatus,
        UserType performedByType,
        Instant performedAt
) {}