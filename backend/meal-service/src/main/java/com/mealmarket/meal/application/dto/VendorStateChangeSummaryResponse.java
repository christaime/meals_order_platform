package com.mealmarket.meal.application.dto;

import com.mealmarket.meal.domain.model.VendorState;

import java.time.Instant;

public record VendorStateChangeSummaryResponse(
        VendorState.VendorStatus toStatus,
        String reason,
        VendorState.StateChangeType changeType,
        Instant changedAt
) {}