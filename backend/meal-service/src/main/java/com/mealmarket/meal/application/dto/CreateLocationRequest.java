package com.mealmarket.meal.application.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

/**
 * Request to create a new distribution location.
 *
 * The vendor is NOT in the request — it is derived from the
 * authenticated user (via security context) by the service layer.
 * moderationStatus is NOT in the request — always set to PENDING on creation.
 */
public record CreateLocationRequest(

        @NotBlank(message = "Location name is required")
        @Size(min = 2, max = 100, message = "Location name must be between 2 and 100 characters")
        String name,

        @NotBlank(message = "Address is required")
        @Size(max = 255, message = "Address cannot exceed 255 characters")
        String address,

        @Size(max = 50, message = "Phone cannot exceed 50 characters")
        String phone,

        @NotNull(message = "Latitude is required")
        Double latitude,

        @NotNull(message = "Longitude is required")
        Double longitude,

        @PositiveOrZero(message = "Delivery radius cannot be negative")
        Integer deliveryRadius
) {}