package com.mealmarket.meal.application.dto;

import com.mealmarket.meal.domain.model.ModerationStatus;

import java.time.Instant;
import java.util.UUID;

public record LocationResponse(
        UUID id,

        // Vendor scope (only IDs + display name — full vendor info lives in VendorResponse)
        UUID vendorId,
        String vendorBusinessName,

        // Location details
        String name,
        CityResponse city,
        String address,
        String phone,
        Double latitude,
        Double longitude,
        Integer deliveryRadius,

        // Moderation
        ModerationStatus moderationStatus,
        Boolean isActive,

        // Timestamps
        Instant createdAt,
        Instant updatedAt
) {}