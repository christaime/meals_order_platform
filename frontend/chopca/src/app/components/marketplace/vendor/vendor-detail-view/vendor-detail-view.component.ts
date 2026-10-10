import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  signal,
  computed,
  OnInit,
  DestroyRef,
  inject, effect
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MealSummary, VendorSummary, CategorySummary,MealSearchRequest } from '@core/models/marketplace';
import {
  IconComponent,
  RatingStarsComponent,
} from '@components/shared';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { ToastService } from '@components/shared/toast/toast.service';
import { MealCardSkeletonComponent,MealCatalogViewComponent, FloatingCartSummaryComponent , FilterState, StatItem} from '@components/marketplace/meal/view';
import { MEAL_SERVICE } from '@core/services/marketplace/meal.service';

export interface VendorMenuCategory {
  readonly id: string;
  readonly name: string;
  readonly itemCount: number;
}

@Component({
  selector: 'app-vendor-detail-view',
  standalone: true,
  imports: [
    CommonModule,
    IconComponent,
    RatingStarsComponent,
    MealCatalogViewComponent,
    FloatingCartSummaryComponent,
    MealCardSkeletonComponent
  ],
  templateUrl: './vendor-detail-view.component.html',
  styleUrl: './vendor-detail-view.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VendorDetailViewComponent {
  // ─── Inputs & Outputs ──────────────────────────────────────────────
  readonly vendor = input<VendorSummary | null>(null);
  readonly isLoading = input<boolean>(false);

  private readonly mealService = inject(MEAL_SERVICE);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  // ─── Meal catalog state ───────────────────────────────────
  readonly meals = signal<MealSummary[] | null>(null);
  readonly isLoadingMeals = signal<boolean>(true);
  readonly totalMeals = signal<number>(0);
  readonly pageSize = signal<number>(8);

  // ─── Cart state (temporary — to be replaced by CartService) ───
  readonly cartItemCount = signal<number>(0);
  readonly cartTotal = signal<number>(0);
  readonly cartVendorName = signal<string | null>(null);

  readonly addToCart = output<MealSummary>();
  readonly viewMealDetails = output<MealSummary>();

  readonly isVendorOpen = computed(() => {
    const v = this.vendor();
    if (!v) return false;
    return v.isOpen ?? v.status === 'ACTIVE';
  });

  readonly skeletonArray = computed(() => Array.from({ length: 6 }));

  constructor() {
     effect(() => {
        const v = this.vendor();
        if (!v?.id ) return;

        this.load({
                vendorId: this.vendor()?.id,
                moderationStatus: 'APPROVED',
                page: 0,
                size: this.pageSize(),
                sortBy: "name",
                sortDirection: 'ASC'
        });
      });
  }


    // ─── Event handlers ───────────────────────────────────────

    onFilterChange(state: {
      query: string;
      sort: string;
      page: number;
      distributionLocationIds?: string[];
      filters: FilterState;
    }): void {

      console.log('[VendorDetailViewComponent] filter change', state);
      this.load({
        vendorId: this.vendor()?.id,
        moderationStatus: 'APPROVED',
        page: state.page,
        size: this.pageSize(),
        sortBy: ['price-asc','price-desc'].includes(state.sort) ? 'price': state.sort,
        sortDirection: ['price-asc','prepTimeMinutes','name'].includes(state.sort)? 'ASC' : 'DESC',
        ...(state.query ? { keyword:state.query } : {}),
        ...(state.filters ? state.filters : {}),
        distributionLocationIds: state.distributionLocationIds,
        });

    }

    private load(q: MealSearchRequest): void {
      if(!this.vendor()){
        this.toast.show('Échec du chargement des repas', 'error');
        return;
      }
      this.isLoadingMeals.set(true);
      this.mealService.search(q)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: page => {
            this.meals.set(page.content);
            this.totalMeals.set(page.totalElements);
            this.isLoadingMeals.set(false);
          },
          error: err => {
            this.isLoadingMeals.set(false);
            this.toast.show('Échec du chargement des repas', 'error');
            console.error(err);
          },
        });
    }

    onAddToCart(meal: MealSummary): void {
      // Temporary implementation — replace with CartService.
      this.cartItemCount.update(c => c + 1);
      this.cartTotal.update(t => t + meal.price);
      this.cartVendorName.set(meal.vendorBusinessName);
      console.log('[VendorDetailViewComponent] add to cart', meal.name);
    }

    onViewMealDetails(meal: MealSummary): void {
      this.router.navigate(['/meals', meal.id]);
    }

    onOpenCart(): void {
      // TODO: open cart drawer
      console.log('[VendorDetailViewComponent] open cart');
    }
}
