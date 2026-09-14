package com.mealmarket.meal.domain.model;

import com.mealmarket.meal.domain.model.VendorState.StateChangeType;
import com.mealmarket.meal.domain.model.VendorState.VendorStatus;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Unit tests for {@link VendorState}.
 *
 * <p>Scope is intentionally limited to the 11 tests defined in the project
 * test plan. Additional edge cases can be added later once the baseline
 * suite is green.</p>
 *
 * <p>No Spring context is loaded — pure unit test.</p>
 */
@DisplayName("VendorState")
class VendorStateTest {

    // ------------------------------------------------------------------
    // Test fixtures
    // ------------------------------------------------------------------

    private static final UUID ADMIN_ID =
            UUID.fromString("22222222-2222-2222-2222-222222222222");

    // ══════════════════════════════════════════════════════════════════
    // 1. Factory methods
    // ══════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("pending() creates a state with PENDING status")
    void pending_createsStateWithPendingStatus() {
        // When
        final VendorState state = VendorState.pending();

        // Then
        assertThat(state.status()).isEqualTo(VendorStatus.PENDING);
    }

    @Test
    @DisplayName("active() creates a state with ACTIVE status")
    void active_createsStateWithActiveStatus() {
        // When
        final VendorState state = VendorState.active(ADMIN_ID);

        // Then
        assertThat(state.status()).isEqualTo(VendorStatus.ACTIVE);
    }

    @Test
    @DisplayName("banned() creates a state with BANNED status")
    void banned_createsStateWithBannedStatus() {
        // When
        final VendorState state = VendorState.banned("Terms violation", ADMIN_ID);

        // Then
        assertThat(state.status()).isEqualTo(VendorStatus.BANNED);
    }

    // ══════════════════════════════════════════════════════════════════
    // 2. Valid transitions — canTransitionTo()
    // ══════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("canTransitionTo() allows PENDING → ACTIVE")
    void canTransitionTo_allowsPendingToActive() {
        // Given
        final VendorState pending = VendorState.pending();

        // Then
        assertThat(pending.canTransitionTo(VendorStatus.ACTIVE)).isTrue();
    }

    @Test
    @DisplayName("canTransitionTo() allows ACTIVE → SUSPENDED")
    void canTransitionTo_allowsActiveToSuspended() {
        // Given
        final VendorState active = VendorState.active(ADMIN_ID);

        // Then
        assertThat(active.canTransitionTo(VendorStatus.SUSPENDED)).isTrue();
    }

    @Test
    @DisplayName("canTransitionTo() allows ACTIVE → BANNED")
    void canTransitionTo_allowsActiveToBanned() {
        // Given
        final VendorState active = VendorState.active(ADMIN_ID);

        // Then
        assertThat(active.canTransitionTo(VendorStatus.BANNED)).isTrue();
    }

    @Test
    @DisplayName("canTransitionTo() allows SUSPENDED → ACTIVE")
    void canTransitionTo_allowsSuspendedToActive() {
        // Given
        final VendorState suspended =
                VendorState.suspended("Temporary hold", ADMIN_ID);

        // Then
        assertThat(suspended.canTransitionTo(VendorStatus.ACTIVE)).isTrue();
    }

    // ══════════════════════════════════════════════════════════════════
    // 3. Invalid transitions — canTransitionTo()
    // ══════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("canTransitionTo() rejects BANNED → ACTIVE (terminal)")
    void canTransitionTo_rejectsBannedToActive() {
        // Given
        final VendorState banned =
                VendorState.banned("Terms violation", ADMIN_ID);

        // Then
        assertThat(banned.canTransitionTo(VendorStatus.ACTIVE)).isFalse();
    }

    @Test
    @DisplayName("canTransitionTo() rejects ACTIVE → PENDING (no going back)")
    void canTransitionTo_rejectsActiveToPending() {
        // Given
        final VendorState active = VendorState.active(ADMIN_ID);

        // Then
        assertThat(active.canTransitionTo(VendorStatus.PENDING)).isFalse();
    }

    // ══════════════════════════════════════════════════════════════════
    // 4. Terminal state
    // ══════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("isTerminal() returns true only for BANNED")
    void isTerminal_returnsTrueOnlyForBanned() {
        // Given
        final VendorState pending = VendorState.pending();
        final VendorState active = VendorState.active(ADMIN_ID);
        final VendorState suspended =
                VendorState.suspended("Temporary hold", ADMIN_ID);
        final VendorState banned =
                VendorState.banned("Terms violation", ADMIN_ID);

        // Then
        assertThat(pending.isTerminal()).isFalse();
        assertThat(active.isTerminal()).isFalse();
        assertThat(suspended.isTerminal()).isFalse();
        assertThat(banned.isTerminal()).isTrue();
    }

    // ══════════════════════════════════════════════════════════════════
    // 5. Business rule — canAcceptOrders()
    // ══════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("canAcceptOrders() returns true only for ACTIVE")
    void canAcceptOrders_returnsTrueOnlyForActive() {
        // Given
        final VendorState pending = VendorState.pending();
        final VendorState active = VendorState.active(ADMIN_ID);
        final VendorState suspended =
                VendorState.suspended("Temporary hold", ADMIN_ID);
        final VendorState banned =
                VendorState.banned("Terms violation", ADMIN_ID);

        // Then
        assertThat(pending.canAcceptOrders()).isFalse();
        assertThat(active.canAcceptOrders()).isTrue();
        assertThat(suspended.canAcceptOrders()).isFalse();
        assertThat(banned.canAcceptOrders()).isFalse();
    }
}