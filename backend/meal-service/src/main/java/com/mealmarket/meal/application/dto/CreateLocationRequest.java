package com.mealmarket.meal.application.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public record CreateLocationRequest(

        @NotBlank(message = "Location name is required")
        @Size(min = 2, max = 100, message = "Location name must be between 2 and 100 characters")
        String name,

        @NotNull(message = "City is required")                             // NEW
        UUID cityId,                                                       // NEW

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