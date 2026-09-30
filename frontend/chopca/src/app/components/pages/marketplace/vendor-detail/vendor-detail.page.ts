import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';

import {
  VendorDetailViewComponent,
  VendorMenuCategory,
} from '@components/marketplace/vendor/vendor-detail-view/vendor-detail-view.component';

import { VENDOR_SERVICE } from '@app/core/services/marketplace/vendor.service';
import { MEAL_SERVICE } from '@app/core/services/marketplace/meal.service';
import { ToastService } from '@components/shared/toast';
import { Vendor, VendorSummary } from '@app/core/models/marketplace';
import { MealSummary, MealSearchRequest } from '@app/core/models/marketplace';

@Component({
  selector: 'app-vendor-detail-page',
  standalone: true,
  imports: [VendorDetailViewComponent],
  template: `
    <app-vendor-detail-view
      [vendor]="vendorSummary()"
      [categories]="categories()"
      [meals]="meals()"
      [isLoading]="loading()"
      (addToCart)="onAddToCart($event)"
      (viewMealDetails)="onViewMealDetails($event)"
      (categorySelect)="onCategorySelect($event)" />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VendorDetailPageComponent {

  /** Route param, bound via `withComponentInputBinding()`. */
  readonly id = input<string | null>(null);

  private readonly vendorService = inject(VENDOR_SERVICE);
  private readonly mealService = inject(MEAL_SERVICE);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly loading = signal<boolean>(true);
  private readonly vendor = signal<Vendor | null>(null);
  private readonly mealPage = signal<MealSummary[]>([]);

  // ─── View-shaped derived data ─────────────────────────────

  /** `Vendor` is a superset of `VendorSummary` — hand it over as-is. */
  protected readonly vendorSummary = computed<VendorSummary | null>(() => {
    const v = this.vendor();
    return v ? (v as unknown as VendorSummary) : null;
  });

  protected readonly meals = computed<MealSummary[]>(() => this.mealPage());

  /**
   * Menu categories derived from the meals' cuisines and dish types.
   * Each unique category becomes one tab with an item count.
   */
  protected readonly categories = computed<VendorMenuCategory[]>(() => {
    const allMeals = this.meals();
    const counts = new Map<string, { name: string; count: number }>();

    for (const meal of allMeals) {
      for (const cat of [...meal.cuisines, ...meal.dishTypes]) {
        const existing = counts.get(cat.id);
        if (existing) {
          existing.count += 1;
        } else {
          counts.set(cat.id, { name: cat.name, count: 1 });
        }
      }
    }

    return Array.from(counts.entries()).map(([id, { name, count }]) => ({
      id,
      name,
      itemCount: count,
    }));
  });

  constructor() {
    effect(() => {
      const vendorId = this.id();
      if (!vendorId) {
        this.loading.set(false);
        return;
      }
      this.load(vendorId);
    });
  }

  private load(vendorId: string): void {
    this.loading.set(true);

    const mealRequest: MealSearchRequest = {
      vendorId,
      moderationStatus: 'APPROVED',
      page: 0,
      size: 100,
      sortBy: 'name',
      sortDirection: 'ASC',
    };

    forkJoin({
      vendor: this.vendorService.getVendorById(vendorId),
      meals:  this.mealService.search(mealRequest),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ vendor, meals }) => {
          this.vendor.set(vendor);
          this.mealPage.set(meals.content);
          this.loading.set(false);
        },
        error: err => {
          this.loading.set(false);
          this.toast.show('Échec du chargement du restaurant', 'error');
          console.error(err);
        },
      });
  }

  // ─── View events ──────────────────────────────────────────

  protected onAddToCart(_meal: MealSummary): void {
    this.toast.show('Ajout au panier — à venir', 'info');
  }

  protected onViewMealDetails(meal: MealSummary): void {
    this.router.navigate(['/meals', meal.id]);
  }

  protected onCategorySelect(_categoryId: string): void {
    // Filtering is handled inside VendorDetailViewComponent.
  }
}
