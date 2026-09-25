package com.mealmarket.meal.application.port;

import java.util.Set;

/**
 * Outbound port to the Identity & Access Management system.
 *
 * <p>Application services depend on this interface, never on Keycloak
 * directly. The infrastructure layer provides the actual adapter.</p>
 *
 * <p><b>Caller guidance:</b></p>
 * <ul>
 *   <li>{@link #assignRealmRole} and {@link #revokeRealmRole} are idempotent:
 *       assigning a role the user already has, or revoking one they don't,
 *       succeeds without error.</li>
 *   <li>{@link #revokeUserSessions} invalidates ALL active sessions for the
 *       user — including sessions used for other roles (e.g. CUSTOMER,
 *       ADMIN). Only call it when the user is losing their last meaningful
 *       role.</li>
 *   <li>{@link #getRealmRoles} is the query that drives that decision.</li>
 * </ul>
 */
public interface IamPort {

    /**
     * Assigns a realm role to a user.
     *
     * @param userId    the Keycloak user ID (UUID as string)
     * @param roleName  the realm role name (e.g. "VENDOR", "CUSTOMER")
     */
    void assignRealmRole(String userId, String roleName);

    /**
     * Removes a realm role from a user.
     *
     * @param userId    the Keycloak user ID (UUID as string)
     * @param roleName  the realm role name (e.g. "VENDOR")
     */
    void revokeRealmRole(String userId, String roleName);

    /**
     * Returns the realm roles currently assigned to the user.
     *
     * <p>Filtered to the realm role names; does not include client roles,
     * composite roles expansion, or Keycloak built-in defaults like
     * {@code offline_access} or {@code uma_authorization}.</p>
     *
     * @param userId the Keycloak user ID (UUID as string)
     * @return the set of role names, never null, possibly empty
     */
    Set<String> getRealmRoles(String userId);

    /**
     * Revokes all active sessions for the user across every client.
     *
     * <p><b>Warning:</b> this logs the user out of every device and every
     * role. Do not call this from a vendor-deactivation path if the user
     * also holds CUSTOMER or ADMIN — see the session revocation rule in
     * the project context.</p>
     *
     * <p>Idempotent: calling it when the user has no sessions is a no-op.</p>
     *
     * @param userId the Keycloak user ID (UUID as string)
     */
    void revokeUserSessions(String userId);
}