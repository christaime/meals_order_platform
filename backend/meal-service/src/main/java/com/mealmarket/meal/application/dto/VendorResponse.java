package com.mealmarket.meal.application.dto;

import com.mealmarket.meal.domain.model.SubscriptionTier;
import com.mealmarket.meal.domain.model.VendorState;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record VendorResponse(
        // ─── Identification ────────────────────────────────────────
        UUID id,
        UUID userId,

        // ─── Business Info ─────────────────────────────────────────
        String businessName,
        String ownerName,
        String description,
        String address,
        CityResponse city,                     // NEW
        String email,
        String phone,

        // ─── Ratings ───────────────────────────────────────────────
        BigDecimal ratingAvg,
        Integer totalRatings,

        // ─── Current State ─────────────────────────────────────────
        VendorState.VendorStatus status,
        String statusReason,
        Instant statusChangedAt,
        String statusChangedBy,
        VendorState.StateChangeType statusChangeType,

        // ─── Subscription ─────────────────────────────────────────
        SubscriptionTier subscriptionTier,

        // ─── Delivery ──────────────────────────────────────────────
        Integer deliveryRadius,
        String pickupAddress,

        // ─── Profile ───────────────────────────────────────────────
        String profileImageUrl,
        String profileImageStorageRef,
        String coverImageUrl,
        String coverImageStorageRef,
        String idCardFrontUrl,
        String idCardFrontStorageRef,
        String idCardBackUrl,
        String idCardBackStorageRef,

        // ─── Relationships ────────────────────────────────────────
        List<CategorySummaryResponse> cuisines,
        List<LocationSummaryResponse> distributionLocations,

        // ─── Timestamps ────────────────────────────────────────────
        Instant createdAt,
        Instant updatedAt
) {}