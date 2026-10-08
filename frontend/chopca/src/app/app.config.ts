import {
  APP_INITIALIZER,
  ApplicationConfig,
  provideZoneChangeDetection,
  LOCALE_ID
} from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import { routes } from './app.routes';
import { SERVICE_PROVIDERS } from './core/services/service.providers';
import { environment } from '@environments/environment';
import { initializeApp } from './core/initializers/app.initializer';
import { authInterceptor } from './core/interceptor/auth.interceptor';
import { languageInterceptor } from './core/interceptor/language.interceptor';
import { provideKeycloak } from 'keycloak-angular';
import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import localeFrExtra from '@angular/common/locales/extra/fr';
import localeEn from '@angular/common/locales/en';
import localeEnExtra from '@angular/common/locales/extra/en';

registerLocaleData(localeFr, 'fr', localeFrExtra);
registerLocaleData(localeEn, 'en', localeEnExtra);

export const appConfig: ApplicationConfig = {
  providers: [

    { provide: LOCALE_ID, useValue: 'fr' },
    provideRouter(routes,
      withComponentInputBinding(),
       withInMemoryScrolling({
         anchorScrolling: 'enabled',
         scrollPositionRestoration: 'enabled',
       })
    ),
    provideZoneChangeDetection({ eventCoalescing: true }),

    // ─── HTTP interceptors ────────────────────────────────────
    //
    // Order matters — interceptors run in registration order on the
    // request and in reverse order on the response.
    //
    //  1. authInterceptor      — attaches the bearer token to our API,
    //                            handles 401 with refresh + retry,
    //                            redirects to login on refresh failure.
    //                            Anonymous requests pass through untouched.
    //  2. languageInterceptor  — adds Accept-Language for the chat
    //                            system prompt's default language.
    provideHttpClient(
      withInterceptors([
        authInterceptor,
        languageInterceptor,
      ]),
    ),
    ...(environment.useMockServices ? []: [provideKeycloak({
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
      })]
    ),
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
