// src/app/core/i18n/translated-title.strategy.ts
import {
  DestroyRef,
  Injectable,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { forkJoin } from 'rxjs';

/**
 * Resolves the router's `title` value as a translation key and applies
 * the result to the document title.
 *
 * Route definitions set `title: 'routes.meals'` (a key, not a display
 * string). This strategy resolves that key against the current language
 * and appends the app name from `app.name`.
 *
 * Because language switching does not trigger navigation, the strategy
 * also re-applies the title when `onLangChange` fires, using the last
 * snapshot it received from the router.
 *
 * Note: this class must NOT inject `Router`. The router injects the
 * active `TitleStrategy` (to call `updateTitle` on navigation), so
 * injecting `Router` here would create a cycle
 * `TitleStrategy → Router → TitleStrategy` and Angular's DI would throw
 * NG0200 at bootstrap. The last snapshot is cached instead.
 */
@Injectable({ providedIn: 'root' })
export class TranslatedTitleStrategy extends TitleStrategy {

  private readonly titleService = inject(Title);
  private readonly translate = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);

  private static readonly APP_NAME_KEY = 'app.name';
  private static readonly TITLE_SEPARATOR = ' · ';

  /** Last snapshot the router handed us. Reused on language change. */
  private lastSnapshot: RouterStateSnapshot | null = null;

  constructor() {
    super();

    this.translate.onLangChange
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (this.lastSnapshot) {
          this.applyTitle(this.lastSnapshot);
        }
      });
  }

  override updateTitle(snapshot: RouterStateSnapshot): void {
    this.lastSnapshot = snapshot;
    this.applyTitle(snapshot);
  }

  private applyTitle(snapshot: RouterStateSnapshot): void {
    const pageKey = this.buildTitle(snapshot);

    if (!pageKey) {
      this.translate
        .get(TranslatedTitleStrategy.APP_NAME_KEY)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((appName) => {
          this.titleService.setTitle(appName);
        });
      return;
    }

    forkJoin({
      page: this.translate.get(pageKey),
      app: this.translate.get(TranslatedTitleStrategy.APP_NAME_KEY),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ page, app }) => {
        this.titleService.setTitle(
          `${page}${TranslatedTitleStrategy.TITLE_SEPARATOR}${app}`,
        );
      });
  }
}
