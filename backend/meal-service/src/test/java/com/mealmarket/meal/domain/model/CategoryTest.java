package com.mealmarket.meal.domain.model;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Unit tests for {@link Category}.
 *
 * <p>Scope is intentionally limited to the 7 tests defined in the project
 * test plan. Additional edge cases can be added later once the baseline
 * suite is green.</p>
 *
 * <p>No Spring context is loaded — pure unit test.</p>
 */
@DisplayName("Category")
class CategoryTest {

    // ------------------------------------------------------------------
    // Test fixtures
    // ------------------------------------------------------------------

    private static final UUID VENDOR_ID =
            UUID.fromString("11111111-1111-1111-1111-111111111111");

    private static final UUID ADMIN_ID =
            UUID.fromString("22222222-2222-2222-2222-222222222222");

    private static Category newCuisine() {
        return Category.create(
                "Cameroonian",
                "Food from Cameroon",
                "https://cdn.mealmarket.com/icons/cameroon.png",
                CategoryType.CUISINE,
                UserType.VENDOR,
                VENDOR_ID
        );
    }

    private static Category newDishType() {
        return Category.create(
                "Main Dish",
                "Primary course of a meal",
                "https://cdn.mealmarket.com/icons/main-dish.png",
                CategoryType.DISH_TYPE,
                UserType.ADMIN,
                ADMIN_ID
        );
    }

    // ══════════════════════════════════════════════════════════════════
    // 1. Factory — create()
    // ══════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("create() sets moderation status to PENDING")
    void create_setsModerationStatusToPending() {
        // When
        final Category category = newCuisine();

        // Then
        assertThat(category.getModerationStatus())
                .isEqualTo(ModerationStatus.PENDING);
    }

    @Test
    @DisplayName("create() sets created by type and id")
    void create_setsCreatedByTypeAndId() {
        // When
        final Category category = newCuisine();

        // Then
        assertThat(category.getCreatedByType()).isEqualTo(UserType.VENDOR);
        assertThat(category.getCreatedById()).isEqualTo(VENDOR_ID);
    }

    // ══════════════════════════════════════════════════════════════════
    // 2. Derived flag — isActive()
    // ══════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("isActive() returns true only when APPROVED")
    void isActive_returnsTrueOnlyWhenApproved() {
        // Given
        final Category pending = newCuisine();
        final Category approved = pending
                .withModerationStatus(ModerationStatus.APPROVED);

        // Then
        assertThat(pending.isActive()).isFalse();
        assertThat(approved.isActive()).isTrue();
    }

    // ══════════════════════════════════════════════════════════════════
    // 3. Type checks
    // ══════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("isCuisine() returns true for CUISINE type")
    void isCuisine_returnsTrueForCuisineType() {
        assertThat(newCuisine().isCuisine()).isTrue();
    }

    @Test
    @DisplayName("isDishType() returns true for DISH_TYPE type")
    void isDishType_returnsTrueForDishType() {
        assertThat(newDishType().isDishType()).isTrue();
    }

    // ══════════════════════════════════════════════════════════════════
    // 4. Immutability — withModerationStatus()
    // ══════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("withModerationStatus() returns a new instance")
    void withModerationStatus_returnsNewInstance() {
        // Given
        final Category original = newCuisine();

        // When
        final Category updated = original
                .withModerationStatus(ModerationStatus.APPROVED);

        // Then
        assertThat(updated).isNotSameAs(original);
    }

    // ══════════════════════════════════════════════════════════════════
    // 5. Partial update — withUpdatedDetails()
    // ══════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("withUpdatedDetails() updates only provided fields")
    void withUpdatedDetails_updatesOnlyProvidedFields() {
        // Given
        final Category original = newCuisine();
        final UUID originalId = original.getId();
        final Instant originalCreatedAt = original.getCreatedAt();
        final CategoryType originalType = original.getType();
        final UserType originalCreatedByType = original.getCreatedByType();
        final UUID originalCreatedById = original.getCreatedById();

        // When — only name + description change, icon stays
        final Category updated = original.withUpdatedDetails(
                "African",
                "Food from Africa",
                null
        );

        // Then
        assertThat(updated.getName()).isEqualTo("African");
        assertThat(updated.getDescription()).isEqualTo("Food from Africa");
        assertThat(updated.getIconUrl()).isEqualTo(original.getIconUrl());
        assertThat(updated.getType()).isEqualTo(originalType);
        assertThat(updated.getId()).isEqualTo(originalId);
        assertThat(updated.getCreatedAt()).isEqualTo(originalCreatedAt);
        assertThat(updated.getCreatedByType()).isEqualTo(originalCreatedByType);
        assertThat(updated.getCreatedById()).isEqualTo(originalCreatedById);
    }
}