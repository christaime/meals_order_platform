package com.mealmarket.meal.application.dto;

import java.util.UUID;

/**
 * Lightweight ingredient response for meal listings.
 */
public record IngredientSummaryResponse(
        UUID id,
        String name,
        Boolean isAllergen
) {}