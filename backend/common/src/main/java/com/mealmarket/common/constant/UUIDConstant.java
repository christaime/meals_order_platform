package com.mealmarket.common.constant;

import java.util.UUID;

/**
 * Platform-wide constant UUIDs used in audit fields when the actor
 * is not a real authenticated user.
 *
 * <p>These values are stored in UUID-typed columns across all services
 * (e.g., {@code created_by_id}, {@code performed_by_id}, {@code changed_by}).
 *
 * <p>The constant names describe the literal value, not the semantic role.
 * The caller decides what role the constant represents in each context
 * (system action, anonymous action, AI moderator, etc.).
 */
public final class UUIDConstant {

    /**
     * The all-zeros UUID: {@code 00000000-0000-0000-0000-000000000000}.
     *
     * <p>Typically used when the actor is not a real user — e.g., scheduled
     * jobs, event-driven handlers, system-generated data, migrations.
     */
    public static final UUID ALL_ZERO =
            UUID.fromString("00000000-0000-0000-0000-000000000000");

    /**
     * The all-ones UUID: {@code 11111111-1111-1111-1111-111111111111}.
     *
     * <p>Reserved for future use — e.g., anonymous or placeholder contexts.
     */
    public static final UUID ALL_ONE =
            UUID.fromString("11111111-1111-1111-1111-111111111111");

    private UUIDConstant() {
        // Utility class — not instantiable
    }
}