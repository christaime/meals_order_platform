package com.mealmarket.meal.application.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Request to create a new ingredient.
 *
 * The creator is NOT in the request — it is derived from the authenticated
 * user (via security context) by the service layer.
 * moderationStatus is NOT in the request — always set to PENDING on creation.
 */
public record CreateIngredientRequest(

        @NotBlank(message = "Ingredient name is required")
        @Size(min = 2, max = 100, message = "Ingredient name must be between 2 and 100 characters")
        String name,

        Boolean isAllergen
) {}