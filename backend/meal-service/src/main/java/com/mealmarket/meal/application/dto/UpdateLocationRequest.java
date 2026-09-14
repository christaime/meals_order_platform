package com.mealmarket.meal.application.dto;

import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

/**
 * Request to update a distribution location's descriptive fields.
 *
 * Cannot change moderationStatus — that goes through {@link ModerationRequest}.
 */
public record UpdateLocationRequest(

        @Size(min = 2, max = 100, message = "Location name must be between 2 and 100 characters")
        String name,

        @Size(max = 255, message = "Address cannot exceed 255 characters")
        String address,

        @Size(max = 50, message = "Phone cannot exceed 50 characters")
        String phone,

        Double latitude,

        Double longitude,

        @PositiveOrZero(message = "Delivery radius cannot be negative")
        Integer deliveryRadius
) {}