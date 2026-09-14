package com.mealmarket.meal.domain.model;

import java.time.Instant;
import java.util.UUID;
import com.mealmarket.common.constant.UUIDConstant;

/**
 * Value object representing the CURRENT state of a vendor.
 * The full history of state changes is stored in {@link VendorStateChange}.
 */
public record VendorState(
        VendorStatus status,
        String reason,
        Instant changedAt,
        UUID changedBy,
        StateChangeType changeType
) {

    // ─── Nested Enums ───────────────────────────────────────────

    public enum VendorStatus {
        PENDING,
        ACTIVE,
        SUSPENDED,
        BANNED,
        INACTIVE
    }

    public enum StateChangeType {
        SYSTEM,          // Automatic (registration, expiration)
        ADMIN_ACTION,    // Admin banned, suspended, or activated
        VENDOR_ACTION,   // Vendor deactivated themselves
        AUTOMATIC        // Rule-based (e.g., auto-ban after N warnings)
    }

    // ─── Factory Methods ────────────────────────────────────────

    public static VendorState pending() {
        return new VendorState(
                VendorStatus.PENDING,
                "Registration initiated, awaiting activation",
                Instant.now(),
                UUIDConstant.ALL_ZERO,
                StateChangeType.SYSTEM
        );
    }

    public static VendorState active(UUID changedBy) {
        return new VendorState(
                VendorStatus.ACTIVE,
                "Vendor activated",
                Instant.now(),
                changedBy,
                StateChangeType.ADMIN_ACTION
        );
    }

    public static VendorState suspended(String reason, UUID changedBy) {
        return new VendorState(
                VendorStatus.SUSPENDED,
                reason,
                Instant.now(),
                changedBy,
                StateChangeType.ADMIN_ACTION
        );
    }

    public static VendorState banned(String reason, UUID changedBy) {
        return new VendorState(
                VendorStatus.BANNED,
                reason,
                Instant.now(),
                changedBy,
                StateChangeType.ADMIN_ACTION
        );
    }

    public static VendorState inactive(String reason, UUID changedBy) {
        return new VendorState(
                VendorStatus.INACTIVE,
                reason,
                Instant.now(),
                changedBy,
                StateChangeType.VENDOR_ACTION
        );
    }

    // ─── Business Queries ───────────────────────────────────────

    public boolean canAcceptOrders() {
        return status == VendorStatus.ACTIVE;
    }

    public boolean isVisibleToCustomers() {
        return status == VendorStatus.ACTIVE;
    }

    public boolean isBlocked() {
        return status == VendorStatus.BANNED || status == VendorStatus.SUSPENDED;
    }

    public boolean isTerminal() {
        return status == VendorStatus.BANNED;
    }

    public boolean canTransitionTo(VendorStatus target) {
        return switch (this.status) {
            case PENDING -> target == VendorStatus.ACTIVE
                    || target == VendorStatus.INACTIVE;
            case ACTIVE -> target == VendorStatus.SUSPENDED
                    || target == VendorStatus.BANNED
                    || target == VendorStatus.INACTIVE;
            case SUSPENDED -> target == VendorStatus.ACTIVE
                    || target == VendorStatus.BANNED;
            case BANNED -> false;  // Terminal state
            case INACTIVE -> target == VendorStatus.ACTIVE
                    || target == VendorStatus.PENDING;
        };
    }
}