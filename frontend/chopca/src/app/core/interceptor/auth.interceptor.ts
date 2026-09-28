import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { from, switchMap } from 'rxjs';
import { SessionManager } from '@app/core/services/session/session-manager.service';
import { environment } from '@environments/environment';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Only our API needs a bearer token.
  if (!req.url.startsWith(environment.apiUrl)) {
    return next(req);
  }

  const session = inject(SessionManager);

  return from(session.getFreshToken()).pipe(
    switchMap(token => {
      if (!token) return next(req);   // anonymous — send as-is
      return next(req.clone({
        setHeaders: { Authorization: `Bearer ${token}` },
      }));
    }),
  );
};
