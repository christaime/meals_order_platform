package com.mealmarket.meal.application.dto;

import com.mealmarket.meal.domain.model.ModerationStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record MealResponse(
        // ─── Identification ────────────────────────────────────────
        UUID id,

        // Vendor (flattened reference)
        UUID vendorId,
        String vendorBusinessName,

        // ─── Core Fields ──────────────────────────────────────────
        String name,
        String description,
        BigDecimal price,
        String imageUrl,          // computed from storageRef for display
        String imageStorageRef,   // raw ref, for the editor to round-trip

        // ─── Availability & Stats ─────────────────────────────────
        Boolean isAvailable,
        Double averageRating,
        Integer totalRatings,
        Integer prepTimeMinutes,

        // ─── Classification ───────────────────────────────────────
        List<CategorySummaryResponse> cuisines,        // only CUISINE categories
        List<CategorySummaryResponse> dishTypes,       // only DISH_TYPE categories

        // ─── Content ──────────────────────────────────────────────
        List<IngredientSummaryResponse> ingredients,

        // ─── Locations ────────────────────────────────────────────
        List<LocationSummaryResponse> distributionLocations,

        // ─── Moderation ───────────────────────────────────────────
        ModerationStatus moderationStatus,
        Boolean isActive,               // ← derived: moderationStatus == APPROVED

        // ─── Timestamps ───────────────────────────────────────────
        Instant createdAt,
        Instant updatedAt
) {}