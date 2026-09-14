package com.mealmarket.meal.domain.model;

import com.mealmarket.common.validation.DomainValidation;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import lombok.Getter;

import java.time.Instant;
import java.util.UUID;

/**
 * Represents a physical location where a vendor distributes meals.
 * Fully owned by the vendor.
 *
 * Moderation: ALL locations go through moderation before they appear
 * to customers. Creation always sets moderationStatus = PENDING.
 */
@Getter
public class DistributionLocation {

    // ─── Identification ───────────────────────────────────────
    private final UUID id;

    @NotNull(message = "Vendor is required")
    private final Vendor vendor;

    // ─── Location Details ─────────────────────────────────────
    @NotBlank(message = "Location name is required")
    @Size(min = 2, max = 100, message = "Location name must be between 2 and 100 characters")
    private final String name;

    @NotBlank(message = "Address is required")
    @Size(max = 255, message = "Address cannot exceed 255 characters")
    private final String address;

    @Size(max = 50, message = "Phone cannot exceed 50 characters")
    private final String phone;

    // ─── Coordinates ──────────────────────────────────────────
    @NotNull(message = "Latitude is required")
    private final Double latitude;

    @NotNull(message = "Longitude is required")
    private final Double longitude;

    // ─── Delivery ─────────────────────────────────────────────
    @PositiveOrZero(message = "Delivery radius cannot be negative")
    private final Integer deliveryRadius;

    // ─── Moderation ───────────────────────────────────────────
    @NotNull(message = "Moderation status is required")
    private final ModerationStatus moderationStatus;

    // ─── Timestamps ───────────────────────────────────────────
    private final Instant createdAt;
    private final Instant updatedAt;

    private DistributionLocation(Builder builder) {
        this.id = builder.id;
        this.vendor = builder.vendor;
        this.name = builder.name;
        this.address = builder.address;
        this.phone = builder.phone;
        this.latitude = builder.latitude;
        this.longitude = builder.longitude;
        this.deliveryRadius = builder.deliveryRadius;
        this.moderationStatus = builder.moderationStatus;
        this.createdAt = builder.createdAt;
        this.updatedAt = builder.updatedAt;
    }

    public static Builder builder() {
        return new Builder();
    }

    // ═══════════════════════════════════════════════════════════
    //  Derived Properties
    // ═══════════════════════════════════════════════════════════

    public boolean isActive() {
        return moderationStatus == ModerationStatus.APPROVED;
    }

    public boolean isPending() {
        return moderationStatus == ModerationStatus.PENDING;
    }

    public boolean belongsTo(UUID vendorId) {
        return vendor != null && vendor.getId().equals(vendorId);
    }

    // ═══════════════════════════════════════════════════════════
    //  Business Methods
    // ═══════════════════════════════════════════════════════════

    public boolean canDeliverTo(double customerLat, double customerLng) {
        if (latitude == null || longitude == null || deliveryRadius == null) {
            return false;
        }

        double earthRadiusKm = 6371.0;

        double dLat = Math.toRadians(customerLat - latitude);
        double dLng = Math.toRadians(customerLng - longitude);

        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(latitude))
                * Math.cos(Math.toRadians(customerLat))
                * Math.sin(dLng / 2) * Math.sin(dLng / 2);

        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        double distanceKm = earthRadiusKm * c;

        return distanceKm <= deliveryRadius;
    }

    // ═══════════════════════════════════════════════════════════
    //  Factory — Creation always starts as PENDING
    // ═══════════════════════════════════════════════════════════

    public static DistributionLocation create(
            Vendor vendor,
            String name,
            String address,
            String phone,
            Double latitude,
            Double longitude,
            Integer deliveryRadius
    ) {
        return DistributionLocation.builder()
                .vendor(vendor)
                .name(name)
                .address(address)
                .phone(phone)
                .latitude(latitude)
                .longitude(longitude)
                .deliveryRadius(deliveryRadius != null ? deliveryRadius : 10)
                .moderationStatus(ModerationStatus.PENDING)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
    }

    // ═══════════════════════════════════════════════════════════
    //  Copy Helpers
    // ═══════════════════════════════════════════════════════════

    public DistributionLocation withModerationStatus(ModerationStatus newStatus) {
        return baseBuilder().moderationStatus(newStatus).build();
    }

    public DistributionLocation withUpdatedDetails(
            String name, String address, String phone,
            Double latitude, Double longitude, Integer deliveryRadius
    ) {
        return baseBuilder()
                .name(name != null ? name : this.name)
                .address(address != null ? address : this.address)
                .phone(phone != null ? phone : this.phone)
                .latitude(latitude != null ? latitude : this.latitude)
                .longitude(longitude != null ? longitude : this.longitude)
                .deliveryRadius(deliveryRadius != null ? deliveryRadius : this.deliveryRadius)
                .updatedAt(Instant.now())
                .build();
    }

    private Builder baseBuilder() {
        return DistributionLocation.builder()
                .id(this.id)
                .vendor(this.vendor)
                .name(this.name)
                .address(this.address)
                .phone(this.phone)
                .latitude(this.latitude)
                .longitude(this.longitude)
                .deliveryRadius(this.deliveryRadius)
                .moderationStatus(this.moderationStatus)
                .createdAt(this.createdAt)
                .updatedAt(Instant.now());
    }

    // ═══════════════════════════════════════════════════════════
    //  Manual Builder
    // ═══════════════════════════════════════════════════════════

    public static class Builder {
        private UUID id;
        private Vendor vendor;
        private String name;
        private String address;
        private String phone;
        private Double latitude;
        private Double longitude;
        private Integer deliveryRadius = 10;
        private ModerationStatus moderationStatus = ModerationStatus.PENDING;
        private Instant createdAt;
        private Instant updatedAt;

        public Builder id(UUID v) { this.id = v; return this; }
        public Builder vendor(Vendor v) { this.vendor = v; return this; }
        public Builder name(String v) { this.name = v; return this; }
        public Builder address(String v) { this.address = v; return this; }
        public Builder phone(String v) { this.phone = v; return this; }
        public Builder latitude(Double v) { this.latitude = v; return this; }
        public Builder longitude(Double v) { this.longitude = v; return this; }
        public Builder deliveryRadius(Integer v) { this.deliveryRadius = v; return this; }
        public Builder moderationStatus(ModerationStatus v) { this.moderationStatus = v; return this; }
        public Builder createdAt(Instant v) { this.createdAt = v; return this; }
        public Builder updatedAt(Instant v) { this.updatedAt = v; return this; }

        public DistributionLocation build() {
            DistributionLocation location = new DistributionLocation(this);
            DomainValidation.validate(location);
            return location;
        }
    }
}