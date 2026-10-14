import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

/**
 * Attaches the current ngx-translate language to every outgoing request
 * as `Accept-Language`, per HTTP convention.
 *
 * The backend uses this to pick the system prompt's default language.
 * After the first message, the LLM adapts to whatever language the
 * user actually writes in.
 */
export const languageInterceptor: HttpInterceptorFn = (req, next) => {
  const translate = inject(TranslateService);

  // Signal read. By the time any HTTP call fires, use() has already
  // resolved, so this is the language whose translations are loaded.
  // Fall back to 'en' if the signal is still null (very early boot).
  const lang = translate.currentLang() ?? translate.getFallbackLang() ?? 'en';

  return next(
    req.clone({
      setHeaders: { 'Accept-Language': lang },
    }),
  );
};
