package com.mealmarket.meal.application.dto;

import java.util.UUID;

public record CityResponse(
        UUID id,
        String name,
        String region,
        String countryCode
) {}