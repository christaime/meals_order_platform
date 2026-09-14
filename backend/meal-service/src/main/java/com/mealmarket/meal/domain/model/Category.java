package com.mealmarket.meal.domain.model;

import com.mealmarket.common.validation.DomainValidation;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;

import java.time.Instant;
import java.util.UUID;

/**
 * Unified classification entity for both cuisines and dish types.
 *
 * Moderation: ALL categories go through moderation. Creation always
 * sets moderationStatus = PENDING.
 *
 * Examples:
 * - CUISINE:  "Cameroonian", "African", "Italian"
 * - DISH_TYPE:"Main Dish", "Dessert", "Beverage"
 */
@Getter
public class Category {

    // ─── Core Fields ──────────────────────────────────────────
    private final UUID id;

    @NotBlank(message = "Category name is required")
    @Size(min = 2, max = 50, message = "Category name must be between 2 and 50 characters")
    private final String name;

    @Size(max = 255, message = "Description cannot exceed 255 characters")
    private final String description;

    @Size(max = 500, message = "Icon URL cannot exceed 500 characters")
    private final String iconUrl;

    @NotNull(message = "Category type is required")
    private final CategoryType type;

    // ─── Origin ───────────────────────────────────────────────
    @NotNull(message = "Created by type is required")
    private final UserType createdByType;

    @NotNull(message = "Created by ID is required")
    private final UUID createdById;

    // ─── Moderation ───────────────────────────────────────────
    @NotNull(message = "Moderation status is required")
    private final ModerationStatus moderationStatus;

    // ─── Timestamps ───────────────────────────────────────────
    private final Instant createdAt;
    private final Instant updatedAt;

    private Category(Builder builder) {
        this.id = builder.id;
        this.name = builder.name;
        this.description = builder.description;
        this.iconUrl = builder.iconUrl;
        this.type = builder.type;
        this.createdByType = builder.createdByType;
        this.createdById = builder.createdById;
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

    public boolean isCuisine() {
        return type == CategoryType.CUISINE;
    }

    public boolean isDishType() {
        return type == CategoryType.DISH_TYPE;
    }

    public boolean isUsable() {
        return isActive();
    }

    // ═══════════════════════════════════════════════════════════
    //  Factory — Creation always starts as PENDING
    // ═══════════════════════════════════════════════════════════

    public static Category create(
            String name,
            String description,
            String iconUrl,
            CategoryType type,
            UserType createdByType,
            UUID createdById
    ) {
        return Category.builder()
                .name(name)
                .description(description)
                .iconUrl(iconUrl)
                .type(type)
                .createdByType(createdByType)
                .createdById(createdById)
                .moderationStatus(ModerationStatus.PENDING)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
    }

    // ═══════════════════════════════════════════════════════════
    //  Copy Helpers
    // ═══════════════════════════════════════════════════════════

    public Category withModerationStatus(ModerationStatus newStatus) {
        return baseBuilder().moderationStatus(newStatus).build();
    }

    public Category withUpdatedDetails(String name, String description, String iconUrl) {
        return baseBuilder()
                .name(name != null ? name : this.name)
                .description(description != null ? description : this.description)
                .iconUrl(iconUrl != null ? iconUrl : this.iconUrl)
                .updatedAt(Instant.now())
                .build();
    }

    private Builder baseBuilder() {
        return Category.builder()
                .id(this.id)
                .name(this.name)
                .description(this.description)
                .iconUrl(this.iconUrl)
                .type(this.type)
                .createdByType(this.createdByType)
                .createdById(this.createdById)
                .moderationStatus(this.moderationStatus)
                .createdAt(this.createdAt)
                .updatedAt(Instant.now());
    }

    // ═══════════════════════════════════════════════════════════
    //  Manual Builder
    // ═══════════════════════════════════════════════════════════

    public static class Builder {
        private UUID id;
        private String name;
        private String description;
        private String iconUrl;
        private CategoryType type;
        private UserType createdByType;
        private UUID createdById;
        private ModerationStatus moderationStatus = ModerationStatus.PENDING;
        private Instant createdAt;
        private Instant updatedAt;

        public Builder id(UUID v) { this.id = v; return this; }
        public Builder name(String v) { this.name = v; return this; }
        public Builder description(String v) { this.description = v; return this; }
        public Builder iconUrl(String v) { this.iconUrl = v; return this; }
        public Builder type(CategoryType v) { this.type = v; return this; }
        public Builder createdByType(UserType v) { this.createdByType = v; return this; }
        public Builder createdById(UUID v) { this.createdById = v; return this; }
        public Builder moderationStatus(ModerationStatus v) { this.moderationStatus = v; return this; }
        public Builder createdAt(Instant v) { this.createdAt = v; return this; }
        public Builder updatedAt(Instant v) { this.updatedAt = v; return this; }

        public Category build() {
            Category category = new Category(this);
            DomainValidation.validate(category);
            return category;
        }
    }
}