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
        String description,
        String address,
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
        String profileImageUrl,          // computed from profileImageStorageRef
        String profileImageStorageRef,   // raw ref, for the editor
        String coverImageUrl,            // computed from coverImageStorageRef
        String coverImageStorageRef,     // raw ref, for the editor
        String idCardFrontUrl,           // computed from idCardFrontStorageRef
        String idCardFrontStorageRef,    // raw ref, for the editor
        String idCardBackUrl,            // computed from idCardBackStorageRef
        String idCardBackStorageRef,     // raw ref, for the editor

        // ─── Relationships ────────────────────────────────────────
        List<CategorySummaryResponse> cuisines,
        List<LocationSummaryResponse> distributionLocations,

        // ─── Timestamps ────────────────────────────────────────────
        Instant createdAt,
        Instant updatedAt
) {}