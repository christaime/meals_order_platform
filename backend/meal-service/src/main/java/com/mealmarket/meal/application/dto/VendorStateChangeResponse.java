package com.mealmarket.meal.application.dto;

import com.mealmarket.meal.domain.model.VendorState;

import java.time.Instant;
import java.util.UUID;

public record VendorStateChangeResponse(
        UUID id,
        UUID vendorId,
        VendorState.VendorStatus fromStatus,      // null for initial state
        VendorState.VendorStatus toStatus,
        String reason,
        UUID changedBy,
        VendorState.StateChangeType changeType,
        Instant changedAt
) {}