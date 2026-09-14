package com.mealmarket.meal.application.dto;

import jakarta.validation.constraints.Size;

/**
 * Request to update an ingredient's descriptive fields.
 *
 * Cannot change moderationStatus — that goes through {@link ModerationRequest}.
 */
public record UpdateIngredientRequest(

        @Size(min = 2, max = 100, message = "Ingredient name must be between 2 and 100 characters")
        String name,

        Boolean isAllergen
) {}