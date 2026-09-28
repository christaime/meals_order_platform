import { inject } from '@angular/core';
import { UserContextService } from '@app/core/services/auth/user-context.service';
import { RoleContext } from '@app/core/services/auth/role-context.service';
import { KeycloakService } from '@app/core/services/auth/keycloak.service';

/**
 * Runs once before the app renders its first route.
 *
 * The app is fully public at the route level. This initializer does NOT
 * gate access to anything — it only warms up the session state so that
 * guards, the header, and the moderation panel have correct data on the
 * first render.
 *
 * Behavior:
 *  - Anonymous user: roles = empty set, context = null. No network call.
 *  - Authenticated user: roles populated from JWT, context fetched once.
 *  - Any failure: logged, swallowed. The app boots into a public state.
 */
export function initializeApp(): () => Promise<void> {
  const ctx = inject(UserContextService);
  const roles = inject(RoleContext);
  const keycloak = inject(KeycloakService);

  return async () => {
    // 1. Roles — cheap, no network. Empty set for anonymous.
    roles.reload();

    // 2. Context — only meaningful for an authenticated user. Skipped for
    //    anonymous so public pages render without a 401 round-trip.
    if (!keycloak.isAuthenticated()) return;

    try {
      await ctx.ensureLoaded();
    } catch (e) {
      // Non-fatal. Guards/pages call ensureLoaded(0) to retry.
      console.error('[init] Failed to load user context', e);
    }
  };
}
