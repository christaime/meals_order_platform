package com.mealmarket.common.constant;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Unit tests for {@link UUIDConstant}.
 *
 * <p>These tests act as <strong>regression guards</strong>: the constant values
 * are part of the public contract of the domain (they are used as sentinel
 * identifiers across the codebase), so any accidental change must fail the
 * build loudly.</p>
 *
 * <p>No Spring context is loaded — pure unit test.</p>
 */
@DisplayName("UUIDConstant")
class UUIDConstantTest {

    // ------------------------------------------------------------------
    // Value stability — regression guards
    // ------------------------------------------------------------------

    @Nested
    @DisplayName("allZero")
    class AllZero {

        @Test
        @DisplayName("has the expected value (regression guard)")
        void allZero_hasExpectedValue() {
            // Given
            final UUID expected = UUID.fromString("00000000-0000-0000-0000-000000000000");

            // When
            final UUID actual = UUIDConstant.ALL_ZERO;

            // Then
            assertThat(actual).isEqualTo(expected);
        }

        @Test
        @DisplayName("is the nil UUID")
        void allZero_isNilUuid() {
            assertThat(UUIDConstant.ALL_ZERO)
                    .isEqualTo(new UUID(0L, 0L));
        }
    }

    @Nested
    @DisplayName("allOne")
    class AllOne {

        @Test
        @DisplayName("has the expected value (regression guard)")
        void allOne_hasExpectedValue() {
            // Given
            final UUID expected = UUID.fromString("11111111-1111-1111-1111-111111111111");

            // When
            final UUID actual = UUIDConstant.ALL_ONE;

            // Then
            assertThat(actual).isEqualTo(expected);
        }
    }

    // ------------------------------------------------------------------
    // Distinctness
    // ------------------------------------------------------------------

    @Nested
    @DisplayName("distinctness")
    class Distinctness {

        @Test
        @DisplayName("allZero is not equal to allOne")
        void allZero_isNotEqualToAllOne() {
            assertThat(UUIDConstant.ALL_ZERO)
                    .isNotEqualTo(UUIDConstant.ALL_ONE);
        }

    }
}