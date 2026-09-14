package com.mealmarket.meal.application.dto;

import com.mealmarket.meal.domain.model.CategoryType;

import java.time.Instant;
import java.util.UUID;

public record CategoryResponse(
        UUID id,
        String name,
        String description,
        String iconUrl,
        CategoryType type,
        Boolean isActive,
        Instant createdAt,
        Instant updatedAt
) {}