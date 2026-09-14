package com.mealmarket.meal.domain.model;

import com.mealmarket.common.validation.DomainValidation;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;

import java.time.Instant;
import java.util.UUID;

/**
 * Value object representing a single state change in a vendor's history.
 * Immutable, used for the audit trail.
 */
@Getter
public class VendorStateChange {

    private final UUID id;

    @NotNull(message = "Vendor ID is required")
    private final UUID vendorId;

    private final VendorState.VendorStatus fromStatus;   // null for initial state

    @NotNull(message = "Target status is required")
    private final VendorState.VendorStatus toStatus;

    @Size(max = 2000, message = "Reason cannot exceed 2000 characters")
    private final String reason;

    @NotNull(message = "Changed by is required")
    private final UUID changedBy;

    @NotNull(message = "Change type is required")
    private final VendorState.StateChangeType changeType;

    private final Instant changedAt;

    private VendorStateChange(Builder builder) {
        this.id = builder.id;
        this.vendorId = builder.vendorId;
        this.fromStatus = builder.fromStatus;
        this.toStatus = builder.toStatus;
        this.reason = builder.reason;
        this.changedBy = builder.changedBy;
        this.changeType = builder.changeType;
        this.changedAt = builder.changedAt;
    }

    public static Builder builder() {
        return new Builder();
    }

    // ─── Factory Methods ────────────────────────────────────────

    public static VendorStateChange initial(UUID vendorId) {
        return VendorStateChange.builder()
                .vendorId(vendorId)
                .fromStatus(null)
                .toStatus(VendorState.VendorStatus.PENDING)
                .reason("Vendor registered")
                .changedBy(vendorId)
                .changeType(VendorState.StateChangeType.VENDOR_ACTION)
                .changedAt(Instant.now())
                .build();
    }

    // ─── Manual Builder with Validation ─────────────────────────

    public static class Builder {
        private UUID id;
        private UUID vendorId;
        private VendorState.VendorStatus fromStatus;
        private VendorState.VendorStatus toStatus;
        private String reason;
        private UUID changedBy;
        private VendorState.StateChangeType changeType;
        private Instant changedAt;

        public Builder id(UUID id) {
            this.id = id;
            return this;
        }

        public Builder vendorId(UUID vendorId) {
            this.vendorId = vendorId;
            return this;
        }

        public Builder fromStatus(VendorState.VendorStatus fromStatus) {
            this.fromStatus = fromStatus;
            return this;
        }

        public Builder toStatus(VendorState.VendorStatus toStatus) {
            this.toStatus = toStatus;
            return this;
        }

        public Builder reason(String reason) {
            this.reason = reason;
            return this;
        }

        public Builder changedBy(UUID changedBy) {
            this.changedBy = changedBy;
            return this;
        }

        public Builder changeType(VendorState.StateChangeType changeType) {
            this.changeType = changeType;
            return this;
        }

        public Builder changedAt(Instant changedAt) {
            this.changedAt = changedAt;
            return this;
        }

        public VendorStateChange build() {
            // Enforce required fields
            if (vendorId == null ) {
                throw new IllegalArgumentException("Vendor ID is required");
            }
            if (toStatus == null) {
                throw new IllegalArgumentException("Target status is required");
            }
            if (changedBy == null ) {
                throw new IllegalArgumentException("Changed by is required");
            }
            if (changeType == null) {
                throw new IllegalArgumentException("Change type is required");
            }

            VendorStateChange change = new VendorStateChange(this);
            DomainValidation.validate(change);
            return change;
        }
    }
}