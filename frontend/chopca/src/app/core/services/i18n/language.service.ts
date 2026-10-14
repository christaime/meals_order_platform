import { Injectable, signal, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

export const STORAGE_KEY = 'app.lang';
const SUPPORTED = ['en', 'fr'] as const;
export type AppLanguage = typeof SUPPORTED[number];

@Injectable({ providedIn: 'root' })
export class LanguageService {

  private readonly translate = inject(TranslateService);
  readonly supported = SUPPORTED;

  private readonly _current = signal<AppLanguage>(this.readStored() ?? 'en');
  readonly current = this._current.asReadonly();

  constructor(){
    window.addEventListener('storage', (event) => {
      if (event.key === STORAGE_KEY && event.newValue) {
        this._current.set(event.newValue as AppLanguage);
        this.translate.use(event.newValue);   // propagate to ngx-translate
      }
    });
  }

  /** Called by AppComponent on startup and by the header on switch. */
  persist(lang: AppLanguage): void {
    console.log("persist ",{lang});
    this._current.set(lang);
    localStorage.setItem(STORAGE_KEY, lang);
  }

  private readStored(): AppLanguage | null {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw && (SUPPORTED as readonly string[]).includes(raw)
      ? (raw as AppLanguage)
      : null;
  }
}
