package com.mealmarket.meal.domain.model;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Unit tests for {@link Meal}.
 *
 * <p>Scope is intentionally limited to the 10 tests defined in the project
 * test plan. Additional edge cases can be added later once the baseline
 * suite is green.</p>
 *
 * <p>No Spring context is loaded — pure unit test.</p>
 */
@DisplayName("Meal")
class MealTest {

    // ------------------------------------------------------------------
    // Test fixtures
    // ------------------------------------------------------------------

    private static final UUID VENDOR_ID =
            UUID.fromString("11111111-1111-1111-1111-111111111111");

    private static final UUID ADMIN_ID =
            UUID.fromString("22222222-2222-2222-2222-222222222222");

    // ─── Vendors ─────────────────────────────────────────────

    private static Vendor activeVendor() {
        return Vendor.builder()
                .id(VENDOR_ID)
                .userId(UUID.randomUUID())
                .businessName("Delicious Bites")
                .address("123 Main Street, Yaoundé")
                .email("vendor@deliciousbites.com")
                .phone("+237612345678")
                .state(VendorState.active(ADMIN_ID))
                .build();
    }

    private static Vendor bannedVendor() {
        return Vendor.builder()
                .id(VENDOR_ID)
                .userId(UUID.randomUUID())
                .businessName("Delicious Bites")
                .address("123 Main Street, Yaoundé")
                .email("vendor@deliciousbites.com")
                .phone("+237612345678")
                .state(VendorState.banned("Terms violation", ADMIN_ID))
                .build();
    }

    // ─── Ingredients ─────────────────────────────────────────

    private static Ingredient beef() {
        return Ingredient.create("Beef", false,UserType.ADMIN,UUID.randomUUID());
    }

    private static Ingredient shrimp() {
        return Ingredient.create("Shrimp", true,UserType.ADMIN,UUID.randomUUID());   // allergen
    }

    // ─── Meals ───────────────────────────────────────────────

    private static Meal newMeal(Vendor vendor, List<Ingredient> ingredients) {
        return Meal.create(
                vendor,
                "Ndolé with Plantains",
                "Traditional Cameroonian dish",
                new BigDecimal("2500.00"),
                "https://cdn.mealmarket.com/meals/ndole.jpg",
                45,
                List.of(),
                ingredients,
                List.of()
        );
    }

    private static Meal defaultMeal() {
        return newMeal(activeVendor(), List.of(beef()));
    }

    // ══════════════════════════════════════════════════════════════════
    // 1. Factory — create()
    // ══════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("create() sets moderation status to PENDING")
    void create_setsModerationStatusToPending() {
        // When
        final Meal meal = defaultMeal();

        // Then
        assertThat(meal.getModerationStatus())
                .isEqualTo(ModerationStatus.PENDING);
    }

    @Test
    @DisplayName("create() sets isAvailable to true")
    void create_setsIsAvailableToTrue() {
        // When
        final Meal meal = defaultMeal();

        // Then
        assertThat(meal.getIsAvailable()).isTrue();
    }

    // ══════════════════════════════════════════════════════════════════
    // 2. Visibility — isVisibleToCustomers()
    // ══════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("isVisibleToCustomers() returns false when PENDING")
    void isVisibleToCustomers_returnsFalseWhenPending() {
        // Given
        final Meal meal = defaultMeal();   // PENDING by default

        // Then
        assertThat(meal.isVisibleToCustomers()).isFalse();
    }

    @Test
    @DisplayName("isVisibleToCustomers() returns false when not available")
    void isVisibleToCustomers_returnsFalseWhenNotAvailable() {
        // Given
        final Meal meal = defaultMeal()
                .withModerationStatus(ModerationStatus.APPROVED)
                .withAvailability(false);

        // Then
        assertThat(meal.isVisibleToCustomers()).isFalse();
    }

    @Test
    @DisplayName("isVisibleToCustomers() returns false when vendor is inactive")
    void isVisibleToCustomers_returnsFalseWhenVendorInactive() {
        // Given
        final Meal meal = newMeal(bannedVendor(), List.of(beef()))
                .withModerationStatus(ModerationStatus.APPROVED);

        // Then
        assertThat(meal.isVisibleToCustomers()).isFalse();
    }

    @Test
    @DisplayName("isVisibleToCustomers() returns true when all conditions are met")
    void isVisibleToCustomers_returnsTrueWhenAllConditionsMet() {
        // Given
        final Meal meal = defaultMeal()
                .withModerationStatus(ModerationStatus.APPROVED);
        // vendor is active, isAvailable = true, moderation = APPROVED

        // Then
        assertThat(meal.isVisibleToCustomers()).isTrue();
    }

    // ══════════════════════════════════════════════════════════════════
    // 3. Immutability — withModerationStatus()
    // ══════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("withModerationStatus() returns a new instance")
    void withModerationStatus_returnsNewInstance() {
        // Given
        final Meal original = defaultMeal();

        // When
        final Meal updated = original
                .withModerationStatus(ModerationStatus.APPROVED);

        // Then
        assertThat(updated).isNotSameAs(original);
    }

    @Test
    @DisplayName("withModerationStatus() preserves all other fields")
    void withModerationStatus_preservesOtherFields() {
        // Given
        final Meal original = defaultMeal();

        // When
        final Meal updated = original
                .withModerationStatus(ModerationStatus.APPROVED);

        // Then
        assertThat(updated.getId()).isEqualTo(original.getId());
        assertThat(updated.getVendor()).isEqualTo(original.getVendor());
        assertThat(updated.getName()).isEqualTo(original.getName());
        assertThat(updated.getDescription()).isEqualTo(original.getDescription());
        assertThat(updated.getPrice()).isEqualByComparingTo(original.getPrice());
        assertThat(updated.getImageUrl()).isEqualTo(original.getImageUrl());
        assertThat(updated.getIsAvailable()).isEqualTo(original.getIsAvailable());
        assertThat(updated.getPrepTimeMinutes()).isEqualTo(original.getPrepTimeMinutes());
        assertThat(updated.getIngredients()).isEqualTo(original.getIngredients());
        assertThat(updated.getCreatedAt()).isEqualTo(original.getCreatedAt());
    }

    // ══════════════════════════════════════════════════════════════════
    // 4. Allergen detection — hasAllergens()
    // ══════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("hasAllergens() returns true when any ingredient is an allergen")
    void hasAllergens_returnsTrueWhenAnyIngredientIsAllergen() {
        // Given
        final Meal meal = newMeal(activeVendor(), List.of(beef(), shrimp()));

        // Then
        assertThat(meal.hasAllergens()).isTrue();
    }

    // ══════════════════════════════════════════════════════════════════
    // 5. Ownership — belongsTo()
    // ══════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("belongsTo() returns true for the same vendor")
    void belongsTo_returnsTrueForSameVendor() {
        // Given
        final Meal meal = defaultMeal();

        // Then
        assertThat(meal.belongsTo(VENDOR_ID)).isTrue();
    }
}