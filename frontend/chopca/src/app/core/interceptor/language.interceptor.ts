import { HttpInterceptorFn } from '@angular/common/http';
import { inject, LOCALE_ID } from '@angular/core';

/**
 * Attaches the current locale to every outgoing request as
 * `Accept-Language`, per HTTP convention.
 *
 * The backend uses this to pick the system prompt's default language.
 * After the first message, the LLM adapts to whatever language the
 * user actually writes in.
 */
export const languageInterceptor: HttpInterceptorFn = (req, next) => {
  const locale = inject(LOCALE_ID);   // 'fr' | 'en' | …
  return next(
    req.clone({
      setHeaders: { 'Accept-Language': locale },
    }),
  );
};
