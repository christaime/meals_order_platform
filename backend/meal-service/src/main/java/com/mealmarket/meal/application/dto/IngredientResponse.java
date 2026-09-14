package com.mealmarket.meal.application.dto;

import com.mealmarket.meal.domain.model.ModerationStatus;
import com.mealmarket.meal.domain.model.UserType;

import java.time.Instant;
import java.util.UUID;

public record IngredientResponse(
        UUID id,
        String name,
        Boolean isAllergen,

        // Origin
        UserType createdByType,
        UUID createdById,

        // Moderation (current state)
        ModerationStatus moderationStatus,
        Boolean isActive,               // ← derived: moderationStatus == APPROVED

        // Timestamps
        Instant createdAt,
        Instant updatedAt
) {}