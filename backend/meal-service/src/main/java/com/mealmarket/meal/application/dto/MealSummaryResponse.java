package com.mealmarket.meal.application.dto;

import com.mealmarket.meal.domain.model.ModerationStatus;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/**
 * Lightweight meal response for listings.
 */
public record MealSummaryResponse(
        UUID id,
        UUID vendorId,
        String vendorBusinessName,
        String name,
        String description,
        BigDecimal price,
        String imageUrl,          // computed, for the card
        Boolean isAvailable,
        Double averageRating,
        Integer totalRatings,
        Integer prepTimeMinutes,
        List<CategorySummaryResponse> cuisines,        // only CUISINE categories
        List<CategorySummaryResponse> dishTypes,       // only DISH_TYPE categories
        Integer ingredientCount,
        Integer distributionLocationCount,
        Integer allergenIngredientCount,
        ModerationStatus moderationStatus
) {}