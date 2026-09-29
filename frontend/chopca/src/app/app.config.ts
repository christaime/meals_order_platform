import {
  APP_INITIALIZER,
  ApplicationConfig,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { routes } from './app.routes';
import { SERVICE_PROVIDERS } from './core/services/service.providers';
import { environment } from '@environments/environment';
import {
  provideKeycloak,
  includeBearerTokenInterceptor,
  INCLUDE_BEARER_TOKEN_INTERCEPTOR_CONFIG,
  createInterceptorCondition,
} from 'keycloak-angular';
import { initializeApp } from './core/initializers/app.initializer';
import { authInterceptor } from './core/interceptor/auth.interceptor';

const apiBearerTokenCondition = createInterceptorCondition({
  urlPattern: new RegExp(
    `^${environment.apiUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/.*$`,
    'i',
  ),
  bearerPrefix: 'Bearer',
});

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, withComponentInputBinding()),
    provideZoneChangeDetection({ eventCoalescing: true }),

    // Public routes only. Route-level guards (e.g. vendorRegistrationGuard)
    // handle the few flows that need auth. The catalog, home, vendor detail,
    // meal detail, etc. are all reachable anonymously.
    provideRouter(routes),

    // The bearer interceptor only injects a token when the request matches
    // `apiBearerTokenCondition` (our API base URL) AND a token exists.
    // Anonymous requests to public endpoints (catalog, vendors, meals) pass
    // through untouched.
    provideHttpClient(withInterceptors([includeBearerTokenInterceptor])),

    provideKeycloak({
      config: {
        url: environment.keycloak.url,
        realm: environment.keycloak.realm,
        clientId: environment.keycloak.clientId,
      },
      initOptions: {
        // `check-sso` = silent SSO check, no redirect. Anonymous users
        // continue straight into the catalog without touching Keycloak's
        // login page.
        onLoad: 'check-sso',
        silentCheckSsoRedirectUri:
          window.location.origin + '/silent-check-sso.html',
        checkLoginIframe: false,
        pkceMethod: 'S256',
      },
    }),

    {
      provide: INCLUDE_BEARER_TOKEN_INTERCEPTOR_CONFIG,
      useValue: [apiBearerTokenCondition],
    },

    // ─── Boot sequence ───────────────────────────────────────
    //
    // Runs AFTER keycloak-angular's own APP_INITIALIZER (registration order).
    //  - Refreshes RoleContext from the JWT if authenticated, else empty set.
    //  - Loads UserContext ONLY if authenticated. Anonymous users skip the
    //    network call entirely, so the catalog renders instantly.
    //  - Failures are swallowed — the app boots into a public state, and
    //    guards/pages retry on demand. Never blank the screen on a 5xx.
    {
      provide: APP_INITIALIZER,
      useFactory: initializeApp,
      multi: true,
    },

    ...SERVICE_PROVIDERS,
  ],
};
