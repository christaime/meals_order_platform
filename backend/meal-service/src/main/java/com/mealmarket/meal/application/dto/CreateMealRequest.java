package com.mealmarket.meal.application.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/**
 * Request to create a new meal.
 *
 * The vendor is NOT in the request — derived from the authenticated user.
 * moderationStatus is NOT in the request — always set to PENDING on creation.
 *
 * The image is passed as a MinIO storage reference (the object key returned
 * by POST /api/v1/media). The URL is derived server-side on read.
 */
public record CreateMealRequest(

        @NotBlank(message = "Meal name is required")
        @Size(min = 3, max = 100, message = "Meal name must be between 3 and 100 characters")
        String name,

        @Size(max = 2000, message = "Description cannot exceed 2000 characters")
        String description,

        @NotNull(message = "Price is required")
        @DecimalMin(value = "0.0", inclusive = false, message = "Price must be greater than 0")
        BigDecimal price,

        /**
         * MinIO storage ref of the meal image (returned by POST /api/v1/media).
         * Null = no image.
         */
        @Size(max = 512, message = "Image storage ref cannot exceed 512 characters")
        String imageStorageRef,

        @PositiveOrZero(message = "Preparation time cannot be negative")
        Integer prepTimeMinutes,

        /**
         * Category IDs — can include both CUISINE and DISH_TYPE categories.
         */
        List<UUID> categoryIds,

        /**
         * Ingredient IDs.
         */
        List<UUID> ingredientIds,

        /**
         * Distribution location IDs where this meal is available.
         * If empty or null, the meal is available at all vendor locations.
         */
        List<UUID> distributionLocationIds
) {}