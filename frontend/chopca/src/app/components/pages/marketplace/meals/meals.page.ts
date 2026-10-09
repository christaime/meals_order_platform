import {
  ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';

import { IconComponent } from '@components/shared/icon/icon.component';
import { PaginatorComponent } from '@components/shared/paginator/paginator.component';
import { VendorPickerComponent } from '@components/shared/vendor-picker/vendor-picker.component';
import { ToastService } from '@components/shared/toast';
import { ModerationPanelComponent } from '@components/marketplace/moderation/moderation-panel/moderation-panel.component';
import {
  MealFiltersComponent,
  MealFiltersValue,
  MealSort,
  ModerationStatusFilter,
} from '@components/marketplace/meal/meal-filters/meal-filters.component';
import { MealTableComponent } from '@components/marketplace/meal/meal-table/meal-table.component';
import {
  MealReferencesPanelComponent,
} from '@components/marketplace/meal/meal-references-panel/meal-references-panel.component';
import {
  FilterState, AdvancedFilterDrawerComponent
} from '@components/marketplace/meal/view/advanced-filter-drawer/advanced-filter-drawer.component';
import {
  DeleteEntityDialogComponent,
} from '@components/shared/delete-entity-dialog/delete-entity-dialog.component';

import { MEAL_SERVICE } from '@app/core/services/marketplace/meal.service';
import { UserContextService } from '@app/core/services/auth/user-context.service';
import { KEYCLOAK_SERVICE } from '@core/services/auth/keycloak.service';
import { MealSummary, MealSearchRequest } from '@app/core/models/marketplace';
import { ModerationStatus } from '@app/core/models/marketplace/enum-type.model';
import { ModerationDataResponse } from '@app/core/models/marketplace/moderation.model';
import { DataPage } from '@app/core/models/shared';

type Scope = 'vendor' | 'admin';

/** Default advanced-filter state (mirrors the drawer's own defaults). */
const DEFAULT_ADVANCED: FilterState = {
  minPrice: 1000,
  maxPrice: 10000,
  maxPrepTime: 60,
  minRating: 0,
  cuisineIds: [],
  dishTypeIds: [],
  excludeIngredientIds: []
};

@Component({
  selector: 'app-meals-page',
  standalone: true,
  imports: [
    IconComponent,
    PaginatorComponent,
    VendorPickerComponent,
    ModerationPanelComponent,
    MealFiltersComponent,
    MealTableComponent,
    MealReferencesPanelComponent,
  ],
  templateUrl: './meals.page.html',
  styleUrl: './meals.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MealsPageComponent {

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly mealService = inject(MEAL_SERVICE);
  private readonly userContext = inject(UserContextService);
  private readonly roleContext = inject(KEYCLOAK_SERVICE);
  private readonly toast = inject(ToastService);
  private readonly dialog = inject(MatDialog);
  private readonly destroyRef = inject(DestroyRef);

  /** Route-data driven: 'vendor' | 'admin'. */
  protected readonly scope = signal<Scope>(
    (this.route.snapshot.data['scope'] as Scope) ?? 'vendor',
  );

  // ─── Simple filters ───────────────────────────────────────
  protected readonly name = signal<string>('');
  protected readonly moderationStatus = signal<ModerationStatusFilter>('ALL');
  protected readonly cityId = signal<string | null>(null);
  protected readonly sort = signal<MealSort>('name-asc');

  // ─── Advanced filters ─────────────────────────────────────
  protected readonly advanced = signal<FilterState>({ ...DEFAULT_ADVANCED });

  // ─── Pagination ───────────────────────────────────────────
  protected readonly page = signal<number>(0);
  protected readonly size = signal<number>(10);

  // ─── Admin-selected vendor ────────────────────────────────
  protected readonly adminVendorId = signal<string | null>(null);

  // ─── Effective vendor ID ──────────────────────────────────
  protected readonly effectiveVendorId = computed<string | null>(() => {
    if (this.scope() === 'vendor') {
      return this.userContext.vendor()?.id ?? null;
    }
    return this.adminVendorId();
  });

  // ─── Data ─────────────────────────────────────────────────
  protected readonly result = signal<DataPage<MealSummary> | null>(null);
  protected readonly loading = signal<boolean>(false);

  // ─── Moderation selection ─────────────────────────────────
  protected readonly editing = signal<MealSummary | null>(null);

  protected readonly moderableMeal = computed<MealSummary | null>(() => {
    if (this.scope() !== 'admin') return null;
    if (!this.roleContext.isAdmin()) return null;
    return this.editing();
  });

  // ─── Query — null when no vendor selected ─────────────────
  private readonly query = computed<MealSearchRequest | null>(() => {
    const vendorId = this.effectiveVendorId();
    if (!vendorId) return null;

    const adv = this.advanced();
    const sort = this.sort();

    // Sort mapping: name-asc/desc, price-asc/desc, recent
    let sortBy = 'name';
    let sortDirection: 'ASC' | 'DESC' = 'ASC';
    if (sort === 'name-desc') { sortBy = 'name'; sortDirection = 'DESC'; }
    else if (sort === 'price-asc') { sortBy = 'price'; sortDirection = 'ASC'; }
    else if (sort === 'price-desc') { sortBy = 'price'; sortDirection = 'DESC'; }
    else if (sort === 'recent') { sortBy = 'createdAt'; sortDirection = 'DESC'; }

    return {
      vendorId,
      page: this.page(),
      size: this.size(),
      sortBy,
      sortDirection,

      // Always on this page
      withCount: true,
      loadFull: false,

      ...(this.name() ? { keyword: this.name() } : {}),
      ...(this.moderationStatus() !== 'ALL'
        ? { moderationStatus: this.moderationStatus() as ModerationStatus }
        : {}),
      ...(this.cityId() ? { cityId: this.cityId()! } : {}),

      // Advanced
      ...(adv ? adv : {})
    } as MealSearchRequest;
  });

  constructor() {
    effect(() => {
      const q = this.query();
      if (!q) {
        this.result.set(null);
        return;
      }
      this.load(q);
    });
  }

  private load(q: MealSearchRequest): void {
    this.loading.set(true);
    this.mealService.search(q)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: page => { this.result.set(page); this.loading.set(false); },
        error: err => {
          this.loading.set(false);
          this.toast.show('Échec du chargement des plats', 'error');
          console.error(err);
        },
      });
  }

  private refresh(): void {
    const q = this.query();
    if (q) this.load(q);
  }

  // ─── Filter handlers (single callback from the bar) ───────
  protected onFiltersChange(value: MealFiltersValue): void {
    this.name.set(value.name);
    this.moderationStatus.set(value.moderationStatus);
    this.cityId.set(value.cityId);
    this.sort.set(value.sort);
    this.advanced.set(value.advanced);
    this.page.set(0);
  }

  protected onPageChange(p: number): void { this.page.set(p); }
  protected onSizeChange(s: number): void { this.size.set(s); this.page.set(0); }

  // ─── Admin vendor selection ───────────────────────────────
  protected onVendorSelected(vendorId: string): void {
    this.adminVendorId.set(vendorId);
    this.editing.set(null);
    this.page.set(0);
  }

  // ─── Row actions ──────────────────────────────────────────
  /** Vendor only — navigates to the dedicated meal editor. */
  protected onEdit(meal: MealSummary): void {
    this.router.navigate(['/vendor/meals/edit', meal.id]);
  }

  /** Admin only — selects the row for moderation. */
  protected onSelectForModeration(meal: MealSummary): void {
    this.editing.set(meal);
  }

  protected onDelete(meal: MealSummary): void {
    this.dialog
      .open(DeleteEntityDialogComponent, {
        data: { name: meal.name, kind: 'meal' },
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(result => {
        if (!result) return;
        this.mealService.deleteMeal(meal.id)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.toast.show('Plat supprimé', 'success');
              if (this.editing()?.id === meal.id) this.editing.set(null);
              this.refresh();
            },
            error: () => this.toast.show('Échec de la suppression', 'error'),
          });
      });
  }

  protected onModerated(_outcome: ModerationDataResponse | null): void {
    // Refresh the list; the moderation panel reloads its own state.
    this.refresh();
  }

  /** Vendor — navigate to the "new meal" editor. */
  protected onQuickNew(): void {
    this.router.navigate(['/vendor/meals/new']);
  }
}
