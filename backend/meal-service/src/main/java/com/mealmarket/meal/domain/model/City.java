package com.mealmarket.meal.domain.model;

import com.mealmarket.common.validation.DomainValidation;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;

import java.time.Instant;
import java.util.UUID;

/**
 * A city where vendors operate and customers can order or collect meals.
 *
 * Reference data — admin-managed, never moderated, never soft-deleted.
 * Precise coordinates live on {@link DistributionLocation}, not here.
 */
@Getter
public class City {

    // ─── Identification ───────────────────────────────────────
    private final UUID id;

    // ─── Core Fields ──────────────────────────────────────────
    @NotBlank(message = "City name is required")
    @Size(min = 2, max = 120, message = "City name must be between 2 and 120 characters")
    private final String name;

    @Size(max = 120, message = "Region cannot exceed 120 characters")
    private final String region;

    @NotBlank(message = "Country code is required")
    @Size(min = 2, max = 2, message = "Country code must be a 2-letter ISO 3166-1 code")
    private final String countryCode;

    // ─── Timestamps ───────────────────────────────────────────
    private final Instant createdAt;
    private final Instant updatedAt;

    private City(Builder builder) {
        this.id = builder.id;
        this.name = builder.name;
        this.region = builder.region;
        this.countryCode = builder.countryCode;
        this.createdAt = builder.createdAt;
        this.updatedAt = builder.updatedAt;
    }

    public static Builder builder() {
        return new Builder();
    }

    // ═══════════════════════════════════════════════════════════
    //  Factory
    // ═══════════════════════════════════════════════════════════

    public static City create(String name, String region, String countryCode) {
        return City.builder()
                .name(name)
                .region(region)
                .countryCode(countryCode)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
    }

    // ═══════════════════════════════════════════════════════════
    //  Business Methods
    // ═══════════════════════════════════════════════════════════

    public String getDisplayName() {
        return region != null && !region.isBlank()
                ? name + ", " + region
                : name;
    }

    public boolean matches(String query) {
        if (query == null || query.isBlank()) return true;
        String q = query.trim().toLowerCase();
        return name.toLowerCase().contains(q)
                || (region != null && region.toLowerCase().contains(q));
    }

    // ═══════════════════════════════════════════════════════════
    //  Copy Helpers
    // ═══════════════════════════════════════════════════════════

    public City withDetails(String name, String region, String countryCode) {
        return baseBuilder()
                .name(name != null ? name : this.name)
                .region(region != null ? region : this.region)
                .countryCode(countryCode != null ? countryCode : this.countryCode)
                .build();
    }

    private Builder baseBuilder() {
        return City.builder()
                .id(this.id)
                .name(this.name)
                .region(this.region)
                .countryCode(this.countryCode)
                .createdAt(this.createdAt)
                .updatedAt(Instant.now());
    }

    // ═══════════════════════════════════════════════════════════
    //  Manual Builder
    // ═══════════════════════════════════════════════════════════

    public static class Builder {
        private UUID id;
        private String name;
        private String region;
        private String countryCode;
        private Instant createdAt;
        private Instant updatedAt;

        public Builder id(UUID v) { this.id = v; return this; }
        public Builder name(String v) { this.name = v; return this; }
        public Builder region(String v) { this.region = v; return this; }
        public Builder countryCode(String v) { this.countryCode = v; return this; }
        public Builder createdAt(Instant v) { this.createdAt = v; return this; }
        public Builder updatedAt(Instant v) { this.updatedAt = v; return this; }

        public City build() {
            City city = new City(this);
            DomainValidation.validate(city);
            return city;
        }
    }
}