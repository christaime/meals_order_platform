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
                moderationStatus,
                isActive,
                createdAt,
                updatedAt
        );
    }
}