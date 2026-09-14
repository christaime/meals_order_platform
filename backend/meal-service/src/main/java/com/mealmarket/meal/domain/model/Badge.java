package com.mealmarket.meal.domain.model;

import com.mealmarket.common.validation.DomainValidation;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;

import java.time.Instant;
import java.util.UUID;

/**
 * Represents a badge that can be awarded to a vendor.
 * Badges are earned through an administrative process.
 */
@Getter
public class Badge {

    private final UUID id;
    private final String name;
    private final String description;
    private final String iconUrl;
    private final Instant createdAt;
    private final Instant updatedAt;

    private Badge(Builder builder) {
        this.id = builder.id;
        this.name = builder.name;
        this.description = builder.description;
        this.iconUrl = builder.iconUrl;
        this.createdAt = builder.createdAt;
        this.updatedAt = builder.updatedAt;
    }

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private UUID id;

        @NotBlank(message = "Badge name is required")
        @Size(min = 2, max = 50, message = "Badge name must be between 2 and 50 characters")
        private String name;

        @Size(max = 500, message = "Badge description cannot exceed 500 characters")
        private String description;

        @Size(max = 500, message = "Icon URL cannot exceed 500 characters")
        private String iconUrl;

        private Instant createdAt;
        private Instant updatedAt;

        public Builder id(UUID id) { this.id = id; return this; }
        public Builder name(String name) { this.name = name; return this; }
        public Builder description(String description) { this.description = description; return this; }
        public Builder iconUrl(String iconUrl) { this.iconUrl = iconUrl; return this; }
        public Builder createdAt(Instant createdAt) { this.createdAt = createdAt; return this; }
        public Builder updatedAt(Instant updatedAt) { this.updatedAt = updatedAt; return this; }

        public Badge build() {
            Badge badge = new Badge(this);
            DomainValidation.validate(badge);
            return badge;
        }
    }
}