import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { NEVER, catchError, from, switchMap, throwError } from 'rxjs';
import Keycloak from 'keycloak-js';
import { SessionManager } from '@app/core/services/session/session-manager.service';
import { AppSessionStore, RETURN_URL_KEY } from '@app/core/storage/app.store';
import { environment } from '@environments/environment';

/**
 * Attaches the bearer token to outgoing API requests.
 *
 * Recovery path: if the backend rejects a request with 401 (token
 * expired or rejected), the interceptor forces a refresh and retries
 * the request ONCE. If the refresh fails — the Keycloak session is
 * gone — the user is redirected to login with the current URL
 * preserved so they land back here after re-authenticating.
 *
 * 403 is passed through untouched: the token was valid, the user just
 * lacks the required authority. Refreshing wouldn't change that.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Only our API needs a bearer token.
  if (!req.url.startsWith(environment.apiUrl)) {
    return next(req);
  }

  const session = inject(SessionManager);
  const keycloak = inject(Keycloak);

  return from(session.getFreshToken()).pipe(
    switchMap(token => {
      if (!token) return next(req);   // anonymous — send as-is
      return next(req.clone({
        setHeaders: { Authorization: `Bearer ${token}` },
      }));
    }),

    catchError((err: unknown) => {
      if (!(err instanceof HttpErrorResponse) || err.status !== 401) {
        return throwError(() => err);
      }

      // The token was rejected. Force a refresh and retry once.
      return from(session.forceRefresh()).pipe(
        switchMap(newToken => next(req.clone({
          setHeaders: { Authorization: `Bearer ${newToken}` },
        }))),

        catchError(() => {
          // Refresh failed — the Keycloak session is gone.
          const returnUrl = window.location.pathname + window.location.search;
          AppSessionStore.set(RETURN_URL_KEY, returnUrl);

          // Fire the redirect. NEVER prevents a spurious error reaching
          // the caller while the browser navigates away.
          void keycloak.login({
            redirectUri: window.location.origin + '/auth/callback',
          });
          return NEVER;
        }),
      );
    }),
  );
};
