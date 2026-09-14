package com.mealmarket.meal.domain.model;

import com.mealmarket.common.validation.DomainValidation;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;

import java.time.Instant;
import java.util.UUID;

/**
 * Represents an ingredient used in meals.
 *
 * Moderation: ALL ingredients go through moderation, regardless of who
 * created them. Creation always sets moderationStatus = PENDING.
 * Only an admin (or AI agent) can approve/reject/disable.
 *
 * The full moderation history is stored in {@link ModerationData}.
 */
@Getter
public class Ingredient {

    // ─── Core ─────────────────────────────────────────────────
    private final UUID id;

    @NotBlank(message = "Ingredient name is required")
    @Size(min = 2, max = 100, message = "Ingredient name must be between 2 and 100 characters")
    private final String name;

    private final Boolean isAllergen;

    // ─── Origin (immutable) ───────────────────────────────────
    @NotNull(message = "Created by type is required")
    private final UserType createdByType;

    @NotNull(message = "Created by ID is required")
    private final UUID createdById;

    // ─── Moderation State ─────────────────────────────────────
    @NotNull(message = "Moderation status is required")
    private final ModerationStatus moderationStatus;

    // ─── Timestamps ───────────────────────────────────────────
    private final Instant createdAt;
    private final Instant updatedAt;

    private Ingredient(Builder builder) {
        this.id = builder.id;
        this.name = builder.name;
        this.isAllergen = builder.isAllergen;
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

    /**
     * An ingredient is active (visible to customers) only when APPROVED.
     * Always derived from moderationStatus — never set directly.
     */
    public boolean isActive() {
        return moderationStatus == ModerationStatus.APPROVED;
    }

    public boolean isPending() {
        return moderationStatus == ModerationStatus.PENDING;
    }

    public boolean isVisibleToCustomers() {
        return isActive();
    }

    // ═══════════════════════════════════════════════════════════
    //  Factory — Creation always starts as PENDING
    // ═══════════════════════════════════════════════════════════

    public static Ingredient create(
            String name,
            Boolean isAllergen,
            UserType createdByType,
            UUID createdById
    ) {
        return Ingredient.builder()
                .name(name)
                .isAllergen(isAllergen != null ? isAllergen : false)
                .createdByType(createdByType)
                .createdById(createdById)
                .moderationStatus(ModerationStatus.PENDING)   // ✅ Always PENDING
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
    }

    // ═══════════════════════════════════════════════════════════
    //  Copy with New Moderation Status
    // ═══════════════════════════════════════════════════════════

    public Ingredient withModerationStatus(ModerationStatus newStatus) {
        return Ingredient.builder()
                .id(this.id)
                .name(this.name)
                .isAllergen(this.isAllergen)
                .createdByType(this.createdByType)
                .createdById(this.createdById)
                .moderationStatus(newStatus)
                .createdAt(this.createdAt)
                .updatedAt(Instant.now())
                .build();
    }

    public Ingredient withUpdatedDetails(String name, Boolean isAllergen) {
        return Ingredient.builder()
                .id(this.id)
                .name(name != null ? name : this.name)
                .isAllergen(isAllergen != null ? isAllergen : this.isAllergen)
                .createdByType(this.createdByType)
                .createdById(this.createdById)
                .moderationStatus(this.moderationStatus)
                .createdAt(this.createdAt)
                .updatedAt(Instant.now())
                .build();
    }

    // ═══════════════════════════════════════════════════════════
    //  Manual Builder
    // ═══════════════════════════════════════════════════════════

    public static class Builder {
        private UUID id;
        private String name;
        private Boolean isAllergen = false;
        private UserType createdByType;
        private UUID createdById;
        private ModerationStatus moderationStatus = ModerationStatus.PENDING;
        private Instant createdAt;
        private Instant updatedAt;

        public Builder id(UUID v) { this.id = v; return this; }
        public Builder name(String v) { this.name = v; return this; }
        public Builder isAllergen(Boolean v) { this.isAllergen = v; return this; }
        public Builder createdByType(UserType v) { this.createdByType = v; return this; }
        public Builder createdById(UUID v) { this.createdById = v; return this; }
        public Builder moderationStatus(ModerationStatus v) { this.moderationStatus = v; return this; }
        public Builder createdAt(Instant v) { this.createdAt = v; return this; }
        public Builder updatedAt(Instant v) { this.updatedAt = v; return this; }

        public Ingredient build() {
            Ingredient ingredient = new Ingredient(this);
            DomainValidation.validate(ingredient);
            return ingredient;
        }
    }
}