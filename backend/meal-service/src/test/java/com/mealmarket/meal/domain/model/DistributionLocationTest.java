package com.mealmarket.meal.domain.model;

import com.mealmarket.meal.testing.TestFixtures;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Unit tests for {@link DistributionLocation}.
 *
 * <p>Scope is intentionally limited to the 5 tests defined in the project
 * test plan. Additional edge cases can be added later once the baseline
 * suite is green.</p>
 *
 * <p>No Spring context is loaded — pure unit test.</p>
 */
@DisplayName("DistributionLocation")
class DistributionLocationTest {

    // ------------------------------------------------------------------
    // Test fixtures
    // ------------------------------------------------------------------

    private static final UUID VENDOR_ID =
            UUID.fromString("11111111-1111-1111-1111-111111111111");

    private static final UUID ADMIN_ID =
            UUID.fromString("22222222-2222-2222-2222-222222222222");

    private static Vendor newVendor() {
        return Vendor.builder()
                .id(VENDOR_ID)
                .userId(UUID.randomUUID())
                .city(TestFixtures.aCity())
                .businessName("Delicious Bites")
                .ownerName("owner")
                .address("123 Main Street, Yaoundé")
                .email("vendor@deliciousbites.com")
                .phone("+237612345678")
                .state(VendorState.active(ADMIN_ID))
                .build();
    }

    private static DistributionLocation newLocation() {
        return DistributionLocation.create(
                newVendor(),
                "Main Branch",
                City.create("Yaoundé","Centre","CM"),
                "123 Main Street, Yaoundé",
                "+237612345678",
                3.8480,
                11.5021,
                10
        );
    }

    // ══════════════════════════════════════════════════════════════════
    // 1. Factory — create()
    // ══════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("create() sets moderation status to PENDING")
    void create_setsModerationStatusToPending() {
        // When
        final DistributionLocation location = newLocation();

        // Then
        assertThat(location.getModerationStatus())
                .isEqualTo(ModerationStatus.PENDING);
    }

    @Test
    @DisplayName("create() sets default delivery radius when null")
    void create_setsDefaultDeliveryRadiusWhenNull() {
        // When
        final DistributionLocation location = DistributionLocation.create(
                newVendor(),
                "Main Branch",
                City.create("Yaoundé","Centre","CM"),
                "123 Main Street, Yaoundé",
                "+237612345678",
                3.8480,
                11.5021,
                null   // no radius provided
        );

        // Then
        assertThat(location.getDeliveryRadius()).isEqualTo(10);
    }

    // ══════════════════════════════════════════════════════════════════
    // 2. Ownership
    // ══════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("belongsTo() returns true for the same vendor")
    void belongsTo_returnsTrueForSameVendor() {
        // Given
        final DistributionLocation location = newLocation();

        // Then
        assertThat(location.belongsTo(VENDOR_ID)).isTrue();
    }

    // ══════════════════════════════════════════════════════════════════
    // 3. Derived flag — isActive()
    // ══════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("isActive() returns true only when APPROVED")
    void isActive_returnsTrueOnlyWhenApproved() {
        // Given
        final DistributionLocation pending = newLocation();
        final DistributionLocation approved = pending
                .withModerationStatus(ModerationStatus.APPROVED);

        // Then
        assertThat(pending.isActive()).isFalse();
        assertThat(approved.isActive()).isTrue();
    }

    // ══════════════════════════════════════════════════════════════════
    // 4. Immutability — withModerationStatus()
    // ══════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("withModerationStatus() returns a new instance")
    void withModerationStatus_returnsNewInstance() {
        // Given
        final DistributionLocation original = newLocation();

        // When
        final DistributionLocation updated = original
                .withModerationStatus(ModerationStatus.APPROVED);

        // Then
        assertThat(updated).isNotSameAs(original);
    }
}