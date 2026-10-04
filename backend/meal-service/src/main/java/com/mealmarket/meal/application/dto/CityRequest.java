package com.mealmarket.meal.application.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record CityRequest(
        @NotBlank(message = "City name is required")
        @Size(min = 2, max = 120)
        String name,

        @Size(max = 120)
        String region,

        @NotBlank(message = "Country code is required")
        @Pattern(regexp = "^[A-Z]{2}$", message = "Country code must be ISO 3166-1 alpha-2")
        String countryCode
) {}