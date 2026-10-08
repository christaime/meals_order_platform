import { inject } from '@angular/core';
import { UserContextService } from '@app/core/services/auth/user-context.service';
import { KEYCLOAK_SERVICE } from '@core/services/auth/keycloak.service';
import { GoogleMapsLoaderService } from '@core/services/google-maps-loader.service';

/**
 * Runs once before the app renders its first route.
 *
 * The app is fully public at the route level. This initializer does NOT
 * gate access to anything — it only warms up shared state (session,
 * roles, Google Maps) so that guards, the header, the moderation panel,
 * and any map component have correct data on the first render.
 *
 * Behavior:
 *  - Anonymous user: roles = empty set, context = null. No network call.
 *  - Authenticated user: roles populated from JWT, context fetched once.
 *  - Google Maps: loaded in parallel; on failure the app still boots and
 *    the components that need a map render a fallback warning.
 *  - Any failure: logged, swallowed. The app boots into a public state.
 */
export function initializeApp(): () => Promise<void> {
  const ctx = inject(UserContextService);
  const keycloakUser = inject(KEYCLOAK_SERVICE);
  const mapsLoader = inject(GoogleMapsLoaderService);

  return async () => {
    keycloakUser.reload();

    // Fire the load once and record the outcome in the loader's state.
    // Not awaited — the app should render while the script downloads.
    void mapsLoader.load();

    if (!keycloakUser.isAuthenticated()) return;

    try {
      await ctx.ensureLoaded();
    } catch (e) {
      console.error('[init] Failed to load user context', e);
    }
  };
}
