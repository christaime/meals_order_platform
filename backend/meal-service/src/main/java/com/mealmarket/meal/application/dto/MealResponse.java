package com.mealmarket.meal.application.dto;

import com.mealmarket.meal.domain.model.ModerationStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record MealResponse(
        UUID id,
        UUID vendorId,
        String vendorBusinessName,
        String name,
        String description,
        BigDecimal price,
        String imageUrl,
        String imageStorageRef,
        Boolean isAvailable,
        Double averageRating,
        Integer totalRatings,
        Integer prepTimeMinutes,
        List<CategorySummaryResponse> cuisines,
        List<CategorySummaryResponse> dishTypes,
        List<IngredientSummaryResponse> ingredients,
        List<LocationSummaryResponse> distributionLocations,
        Integer ingredientCount,
        Integer distributionLocationCount,
        Integer allergenIngredientCount,
        ModerationStatus moderationStatus,
        Boolean isActive,
        Instant createdAt,
        Instant updatedAt
) {
    public MealResponse withImageUrl(String imageUrl) {
        return new MealResponse(
                id,
                vendorId,
                vendorBusinessName,
                name,
                description,
                price,
                imageUrl,
                imageStorageRef,
                isAvailable,
                averageRating,
                totalRatings,
                prepTimeMinutes,
                cuisines,
                dishTypes,
                ingredients,
                distributionLocations,
                ingredientCount,
                distributionLocationCount,
                allergenIngredientCount,
                moderationStatus,
                isActive,
                createdAt,
                updatedAt
        );
    }

    public MealResponse withCounts(Integer ingredientCount, Integer allergenIngredientCount, Integer distributionLocationCount) {
        return new MealResponse(
                id,
                vendorId,
                vendorBusinessName,
                name,
                description,
                price,
                imageUrl,
                imageStorageRef,
                isAvailable,
                averageRating,
                totalRatings,
                prepTimeMinutes,
                cuisines,
                dishTypes,
                ingredients,
                distributionLocations,
                ingredientCount,
                distributionLocationCount,
                allergenIngredientCount,
                moderationStatus,
                isActive,
                createdAt,
                updatedAt
        );
    }

    public MealResponse withthoutIngredientsAndLocations() {
        return new MealResponse(
                id,
                vendorId,
                vendorBusinessName,
                name,
                description,
                price,
                imageUrl,
                imageStorageRef,
                isAvailable,
                averageRating,
                totalRatings,
                prepTimeMinutes,
                cuisines,
                dishTypes,
                List.of(),
                List.of(),
                ingredientCount,
                distributionLocationCount,
                allergenIngredientCount,
                moderationStatus,
                isActive,
                createdAt,
                updatedAt
        );
    }
}