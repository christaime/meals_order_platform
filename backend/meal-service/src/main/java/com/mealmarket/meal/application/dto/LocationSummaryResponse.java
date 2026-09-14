package com.mealmarket.meal.application.dto;

import com.mealmarket.meal.domain.model.ModerationStatus;

import java.util.UUID;

/**
 * Lightweight location response for lists.
 */
public record LocationSummaryResponse(
        UUID id,
        String name,
        String address,
        ModerationStatus moderationStatus
) {}