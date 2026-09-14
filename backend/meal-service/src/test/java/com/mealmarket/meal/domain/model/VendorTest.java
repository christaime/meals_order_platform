package com.mealmarket.meal.domain.model;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Unit tests for {@link Vendor}.
 *
 * <p>Scope follows the same 12-test baseline used for the Category aggregate.
 * Pure unit test — no Spring context.</p>
 */
@DisplayName("Vendor")
class VendorTest {

    private static final UUID VENDOR_ID =
            UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID ADMIN_ID =
            UUID.fromString("22222222-2222-2222-2222-222222222222");
    private static final UUID KEYCLOAK_USER_ID =
            UUID.fromString("33333333-3333-3333-3333-333333333333");

    // ------------------------------------------------------------------
    // Fixtures
    // ------------------------------------------------------------------

    private static Vendor.Builder baseBuilder() {
        return Vendor.builder()
                .id(VENDOR_ID)
                .userId(KEYCLOAK_USER_ID)
                .businessName("Delicious Bites")
                .description("Authentic Cameroonian cuisine")
                .address("123 Main Street, Yaoundé")
                .email("vendor@deliciousbites.com")
                .phone("+237612345678")
                .state(VendorState.active(ADMIN_ID));
    }

    private static Category cuisine(String name) {
        return Category.create(
                name, "Cuisine: " + name, null,
                CategoryType.CUISINE, UserType.ADMIN, ADMIN_ID
        );
    }

    private static Category dishType(String name) {
        return Category.create(
                name, "Dish: " + name, null,
                CategoryType.DISH_TYPE, UserType.ADMIN, ADMIN_ID
        );
    }

    private static DistributionLocation location(UUID id, Vendor vendor, ModerationStatus status) {
        return DistributionLocation.builder()
                .id(id)
                .vendor(vendor)
                .name("Branch " + id)
                .address("Somewhere")
                .latitude(3.8480)
                .longitude(11.5021)
                .deliveryRadius(10)
                .moderationStatus(status)
                .build();
    }

    // ══════════════════════════════════════════════════════════════════
    // A. Factory / Builder validation (3 tests)
    // ══════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("builder() creates a Vendor with all required fields")
    void builder_createsVendorWithAllRequiredFields() {
        // When
        final Vendor vendor = baseBuilder().build();

        // Then
        assertThat(vendor.getId()).isEqualTo(VENDOR_ID);
        assertThat(vendor.getUserId()).isEqualTo(KEYCLOAK_USER_ID);
        assertThat(vendor.getBusinessName()).isEqualTo("Delicious Bites");
        assertThat(vendor.getEmail()).isEqualTo("vendor@deliciousbites.com");
        assertThat(vendor.getPhone()).isEqualTo("+237612345678");
        assertThat(vendor.getState()).isNotNull();
    }

    @Test
    @DisplayName("builder() defaults subscriptionTier to FREE and ratings to zero")
    void builder_defaultsSubscriptionTierToFree() {
        // When
        final Vendor vendor = baseBuilder().build();

        // Then
        assertThat(vendor.getSubscriptionTier()).isEqualTo(SubscriptionTier.FREE);
        assertThat(vendor.getRatingAvg()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(vendor.getTotalRatings()).isZero();
        assertThat(vendor.getDeliveryRadius()).isEqualTo(10);
    }

    @Test
    @DisplayName("builder() throws when required fields are missing")
    void builder_rejectsMissingRequiredFields() {
        // When / Then — missing state
        org.assertj.core.api.Assertions.assertThatThrownBy(() ->
                Vendor.builder()
                        .id(VENDOR_ID)
                        .userId(KEYCLOAK_USER_ID)
                        .businessName("Delicious Bites")
                        .address("123 Main Street, Yaoundé")
                        .email("vendor@deliciousbites.com")
                        .phone("+237612345678")
                        // no state
                        .build()
        ).isInstanceOf(IllegalArgumentException.class);

        // missing businessName
        org.assertj.core.api.Assertions.assertThatThrownBy(() ->
                Vendor.builder()
                        .id(VENDOR_ID)
                        .userId(KEYCLOAK_USER_ID)
                        .address("123 Main Street, Yaoundé")
                        .email("vendor@deliciousbites.com")
                        .phone("+237612345678")
                        .state(VendorState.active(ADMIN_ID))
                        .build()
        ).isInstanceOf(IllegalArgumentException.class);
    }

    // ══════════════════════════════════════════════════════════════════
    // B. Derived state queries (3 tests)
    // ══════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("isActive() returns true only when state is ACTIVE")
    void isActive_returnsTrueOnlyWhenStateActive() {
        final Vendor active = baseBuilder().build();
        final Vendor pending = baseBuilder()
                .state(VendorState.pending())
                .build();
        final Vendor banned = baseBuilder()
                .state(VendorState.banned("Violation", ADMIN_ID))
                .build();

        assertThat(active.isActive()).isTrue();
        assertThat(pending.isActive()).isFalse();
        assertThat(banned.isActive()).isFalse();
    }

    @Test
    @DisplayName("isBanned() returns true only when state is BANNED")
    void isBanned_returnsTrueOnlyWhenStateBanned() {
        final Vendor active = baseBuilder().build();
        final Vendor banned = baseBuilder()
                .state(VendorState.banned("Violation", ADMIN_ID))
                .build();

        assertThat(active.isBanned()).isFalse();
        assertThat(banned.isBanned()).isTrue();
    }

    @Test
    @DisplayName("isSuspended() returns true only when state is SUSPENDED")
    void isSuspended_returnsTrueOnlyWhenStateSuspended() {
        final Vendor active = baseBuilder().build();
        final Vendor suspended = baseBuilder()
                .state(VendorState.suspended("Under review", ADMIN_ID))
                .build();

        assertThat(active.isSuspended()).isFalse();
        assertThat(suspended.isSuspended()).isTrue();
    }

    // ══════════════════════════════════════════════════════════════════
    // C. Category / cuisine helpers (2 tests)
    // ══════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("getCuisines() returns only CUISINE categories")
    void getCuisines_returnsOnlyCuisineCategories() {
        // Given
        final Vendor vendor = baseBuilder()
                .categories(List.of(
                        cuisine("Cameroonian"),
                        cuisine("African"),
                        dishType("Main Dish"),
                        dishType("Dessert")
                ))
                .build();

        // When
        final List<Category> cuisines = vendor.getCuisines();

        // Then
        assertThat(cuisines).hasSize(2);
        assertThat(cuisines)
                .extracting(Category::getType)
                .containsOnly(CategoryType.CUISINE);
        assertThat(vendor.getCuisineNames())
                .containsExactlyInAnyOrder("Cameroonian", "African");
    }

    @Test
    @DisplayName("hasCuisine() matches name ignoring case")
    void hasCuisine_returnsTrueForMatchingNameIgnoringCase() {
        // Given
        final Vendor vendor = baseBuilder()
                .categories(List.of(cuisine("Cameroonian")))
                .build();

        // Then
        assertThat(vendor.hasCuisine("Cameroonian")).isTrue();
        assertThat(vendor.hasCuisine("cameroonian")).isTrue();
        assertThat(vendor.hasCuisine("CAMEROONIAN")).isTrue();
        assertThat(vendor.hasCuisine("Italian")).isFalse();
    }

    // ══════════════════════════════════════════════════════════════════
    // D. Distribution location helpers (2 tests)
    // ══════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("operatesAt() returns true for a known location id")
    void operatesAt_returnsTrueForKnownLocationId() {
        // Given
        final UUID knownId = UUID.randomUUID();
        final UUID unknownId = UUID.randomUUID();

        final Vendor vendor = baseBuilder().build();
        final Vendor vendorWithLocations = baseBuilder()
                .distributionLocations(List.of(
                        location(knownId, vendor, ModerationStatus.APPROVED)
                ))
                .build();

        // Then
        assertThat(vendorWithLocations.operatesAt(knownId)).isTrue();
        assertThat(vendorWithLocations.operatesAt(unknownId)).isFalse();
    }

    @Test
    @DisplayName("getActiveLocations() returns only APPROVED locations")
    void getActiveLocations_returnsOnlyApprovedLocations() {
        // Given
        final Vendor vendor = baseBuilder().build();
        final Vendor withLocations = baseBuilder()
                .distributionLocations(List.of(
                        location(UUID.randomUUID(), vendor, ModerationStatus.APPROVED),
                        location(UUID.randomUUID(), vendor, ModerationStatus.PENDING),
                        location(UUID.randomUUID(), vendor, ModerationStatus.REJECTED)
                ))
                .build();

        // When
        final List<DistributionLocation> active = withLocations.getActiveLocations();

        // Then
        assertThat(active).hasSize(1);
        assertThat(active.get(0).getModerationStatus())
                .isEqualTo(ModerationStatus.APPROVED);
    }

    // ══════════════════════════════════════════════════════════════════
    // E. State transitions (2 tests)
    // ══════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("state transition from ACTIVE to SUSPENDED is allowed")
    void state_canTransitionFromActiveToSuspended() {
        // Given
        final VendorState active = VendorState.active(ADMIN_ID);

        // Then
        assertThat(active.canTransitionTo(VendorState.VendorStatus.SUSPENDED)).isTrue();
        assertThat(active.canTransitionTo(VendorState.VendorStatus.BANNED)).isTrue();
    }

    @Test
    @DisplayName("state remains terminal once BANNED")
    void state_remainsTerminalWhenBanned() {
        // Given
        final VendorState banned = VendorState.banned("Violation", ADMIN_ID);

        // Then
        assertThat(banned.isTerminal()).isTrue();
        assertThat(banned.canTransitionTo(VendorState.VendorStatus.ACTIVE)).isFalse();
        assertThat(banned.canTransitionTo(VendorState.VendorStatus.SUSPENDED)).isFalse();
        assertThat(banned.canTransitionTo(VendorState.VendorStatus.PENDING)).isFalse();
    }
}