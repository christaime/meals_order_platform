package com.mealmarket.meal.application.dto;

import com.mealmarket.meal.domain.model.SubscriptionTier;
import com.mealmarket.meal.domain.model.VendorState;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/**
 * Lightweight vendor response for listings (search results, meal cards).
 *
 * No CNI refs here — sensitive identity documents are only exposed on
 * the full VendorResponse, and only to the owner or an admin.
 */
public record VendorSummaryResponse(
        UUID id,
        String businessName,
        String ownerName,
        String description,
        String address,
        BigDecimal ratingAvg,
        Integer totalRatings,
        SubscriptionTier subscriptionTier,
        VendorState.VendorStatus status,
        List<CategorySummaryResponse> cuisines,
        String profileImageUrl
) {}