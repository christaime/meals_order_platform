import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { SERVICE_PROVIDERS } from './core/services/service.providers';
import { environment } from '@environments/environment';
import {
  provideKeycloak,
  includeBearerTokenInterceptor,
  INCLUDE_BEARER_TOKEN_INTERCEPTOR_CONFIG,
  createInterceptorCondition,
} from 'keycloak-angular';

const apiBearerTokenCondition = createInterceptorCondition({
  // Escape the URL (dots, slashes) and append .*
  urlPattern: new RegExp(`^${environment.apiUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/.*$`, 'i'),
  bearerPrefix: 'Bearer',
});

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),

    // HTTP client with bearer token interceptor
    provideHttpClient(withInterceptors([includeBearerTokenInterceptor])),

    // Keycloak — replaces the deprecated KeycloakAngularModule
   provideKeycloak({
      config: {
        url: environment.keycloak.url,
        realm: environment.keycloak.realm,
        clientId: environment.keycloak.clientId,
      },
      initOptions: {
        onLoad: 'check-sso', // silently check if user is already logged in
        silentCheckSsoRedirectUri: window.location.origin + '/silent-check-sso.html',
        checkLoginIframe: false, // disable iframe check (Keycloak 26+)
        pkceMethod: 'S256',// PKCE for public clients
       // silentCheckSsoFallback: false,
      },
    }),

    // ─── This is what was missing ───────────────────────────
    {
      provide: INCLUDE_BEARER_TOKEN_INTERCEPTOR_CONFIG,
      useValue: [apiBearerTokenCondition],
    },
    ...SERVICE_PROVIDERS,
  ],
};
