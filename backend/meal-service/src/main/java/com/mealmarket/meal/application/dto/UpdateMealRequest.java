package com.mealmarket.meal.application.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/**
 * Request to update a meal's descriptive fields.
 *
 * Cannot change moderationStatus — that goes through {@link ModerationRequest}.
 */
public record UpdateMealRequest(

        @Size(min = 3, max = 100, message = "Meal name must be between 3 and 100 characters")
        String name,

        @Size(max = 2000, message = "Description cannot exceed 2000 characters")
        String description,

        @DecimalMin(value = "0.0", inclusive = false, message = "Price must be greater than 0")
        BigDecimal price,

        @Size(max = 500, message = "Image URL cannot exceed 500 characters")
        String imageUrl,

        @PositiveOrZero(message = "Preparation time cannot be negative")
        Integer prepTimeMinutes,

        Boolean isAvailable,

        /**
         * Full replacement list of category IDs.
         * If null, categories are unchanged. If empty, all categories are removed.
         */
        List<UUID> categoryIds,

        /**
         * Full replacement list of ingredient IDs.
         * If null, ingredients are unchanged. If empty, all ingredients are removed.
         */
        List<UUID> ingredientIds,

        /**
         * Full replacement list of distribution location IDs.
         * If null, locations are unchanged. If empty, meal becomes global.
         */
        List<UUID> distributionLocationIds
) {}