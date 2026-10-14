import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
import { TranslateService, TranslatePipe } from '@ngx-translate/core';
import { IconComponent } from '@components/shared/icon/icon.component';
import { PaginatorComponent } from '@components/shared/paginator/paginator.component';
import { ToastService } from '@components/shared/toast/toast.service';
import { CITY_SERVICE } from '@app/core/services/marketplace/city.service';
import { City, CityRequest, CitySearchRequest } from '@app/core/models/marketplace';
import { DataPage } from '@app/core/models/shared';
import {
  CityFormComponent,
  CityFiltersComponent,
  CityTableComponent,
  type CitySort,
} from '@components/marketplace/city';
import {
  DeleteEntityDialogComponent,
} from '@components/shared/delete-entity-dialog/delete-entity-dialog.component';

@Component({
  selector: 'app-cities-page',
  standalone: true,
  imports: [
    IconComponent,
    PaginatorComponent,
    CityFormComponent,
    CityFiltersComponent,
    CityTableComponent,
    TranslatePipe,
  ],
  templateUrl: './cities.page.html',
  styleUrl: './cities.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CitiesPageComponent {

  private readonly cityService = inject(CITY_SERVICE);
  private readonly toast = inject(ToastService);
  private readonly dialog = inject(MatDialog);
  private readonly destroyRef = inject(DestroyRef);
 private readonly translate = inject(TranslateService);

  // ─── Filter state ──────────────────────────────────────────
  protected readonly keyword = signal<string>('');
  protected readonly sort    = signal<CitySort>('name-asc');

  // ─── Pagination state ──────────────────────────────────────
  protected readonly page = signal<number>(0);
  protected readonly size = signal<number>(10);

  // ─── Data state ────────────────────────────────────────────
  protected readonly result  = signal<DataPage<City> | null>(null);
  protected readonly loading = signal<boolean>(false);

  // ─── Form state ────────────────────────────────────────────
  protected readonly editing    = signal<City | null>(null);
  protected readonly submitting = signal<boolean>(false);

  /**
   * Aggregate of everything that should trigger a re-fetch.
   * Splits `sort` into the two `SearchRequest` fields (`sortBy` + `sortDirection`).
   */
  private readonly query = computed<CitySearchRequest>(() => {
    const [sortBy, sortDirection] = this.sort().split('-') as
      [string, 'ASC' | 'DESC'];
    return {
      page: this.page(),
      size: this.size(),
      ...(this.keyword() ? { keyword: this.keyword() } : {}),
      sortBy,
      sortDirection,
    };
  });

  constructor() {
    effect(() => {
      const q = this.query();
      this.load(q);
    });
  }

  // ─── Filter handlers ───────────────────────────────────────
  protected onKeywordChange(v: string): void {
    this.keyword.set(v);
    this.page.set(0);
  }

  protected onSortChange(v: CitySort): void {
    this.sort.set(v);
    this.page.set(0);
  }

  // ─── Pagination handlers ───────────────────────────────────
  protected onPageChange(p: number): void { this.page.set(p); }
  protected onSizeChange(s: number): void { this.size.set(s); this.page.set(0); }

  // ─── Form handlers ─────────────────────────────────────────
  protected onEdit(city: City): void {
    this.editing.set(city);
    document.getElementById('city-form-container')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  protected onCancelEdit(): void {
    this.editing.set(null);
  }

  protected onSubmit(req: CityRequest): void {
    const current = this.editing();
    this.submitting.set(true);

    const op$ = current
      ? this.cityService.updateCity(current.id, req)
      : this.cityService.createCity(req);

    op$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (saved) => {
        this.submitting.set(false);
        this.editing.set(null);
        this.toast.show(
          this.translate.instant(
            current ? 'citiesPage.toast.updated' : 'citiesPage.toast.created',
          ),
          'success',
        );
        this.refresh();
        void saved;
      },
      error: (err) => {
        this.submitting.set(false);
        this.toast.show(
          this.translate.instant(
            current ? 'citiesPage.toast.updateFailed' : 'citiesPage.toast.createFailed',
          ),
          'error',
        );
        console.error(err);
      },
    });
  }

  protected onDelete(city: City): void {
    this.dialog
      .open(DeleteEntityDialogComponent, {
        data: { name: city.name, kind: 'city' },
        autoFocus: 'dialog',
        restoreFocus: true,
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        if (!result) return;
        this.cityService.deleteCity(city.id)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.translate.instant('citiesPage.toast.deleted'),
              this.refresh();
            },
            error: (err) => {
              this.toast.show(
                this.translate.instant(
                  err?.status === 409
                    ? 'citiesPage.toast.referenced'
                    : 'citiesPage.toast.deleteFailed',
                ),
                'error',
              );
            },
          });
      });
  }

  protected onQuickNew(): void {
    this.editing.set(null);
    document.getElementById('city-form-container')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    document.getElementById('city-name')?.focus?.();
  }

  // ─── Load helpers ──────────────────────────────────────────
  private load(q: CitySearchRequest): void {
    this.loading.set(true);
    this.cityService
      .searchCities(q)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (page) => {
          this.result.set(page);
          this.loading.set(false);
        },
        error: (err) => {
          this.loading.set(false);
          this.toast.show(this.translate.instant('citiesPage.toast.loadFailed'), 'error');
          console.error(err);
        },
      });
  }

  private refresh(): void {
    this.load(this.query());
  }
}
