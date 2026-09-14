package com.mealmarket.meal.application.dto;

import com.mealmarket.meal.domain.model.CategoryType;

import java.util.UUID;

public record CategorySummaryResponse(
        UUID id,
        String name,
        String iconUrl,
        CategoryType type
) {}