import {
  Component,
  ChangeDetectionStrategy,
  signal,
  inject,
  OnInit,
  DestroyRef
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { ToastService } from '@components/shared/toast/toast.service';
import { MealCatalogViewComponent , QuickStatsPillsComponent,
  DeliveryCoverageSectionComponent, FloatingCartSummaryComponent , FilterState} from '@components/marketplace/meal/view';
import { MEAL_SERVICE } from '@app/core/services/marketplace/meal.service';
import { MealSummary, MealSearchRequest } from '@app/core/models/marketplace';

/**
 * Marketplace home page — the public meal catalog.
 *
 * Responsibilities:
 * - Loads meals from the API (via MEAL_SERVICE)
 * - Passes meal data down to MealCatalogViewComponent
 * - Tracks cart state (temporary — to be replaced by CartService)
 * - Handles navigation to meal detail pages
 *
 * This page is a thin orchestrator. All presentation lives in the
 * marketplace components; this page wires them to services and routing.
 */
@Component({
  selector: 'app-marketplace-home-page',
  standalone: true,
  imports: [
    MealCatalogViewComponent,
    QuickStatsPillsComponent,
    DeliveryCoverageSectionComponent,
    FloatingCartSummaryComponent,
  ],
  templateUrl: './marketplace-home.page.html',
  styleUrl: './marketplace-home.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarketplaceHomePageComponent implements OnInit {

  private readonly mealService = inject(MEAL_SERVICE);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  // ─── Meal catalog state ───────────────────────────────────
  readonly meals = signal<MealSummary[] | null>(null);
  readonly isLoading = signal<boolean>(true);
  readonly totalMeals = signal<number>(0);
  readonly pageSize = signal<number>(12);

  // ─── Cart state (temporary — to be replaced by CartService) ───
  readonly cartItemCount = signal<number>(0);
  readonly cartTotal = signal<number>(0);
  readonly cartVendorName = signal<string | null>(null);

  // ─── Lifecycle ────────────────────────────────────────────

  ngOnInit(): void {
    this.loadMeals();
  }

  // ─── Data loading ─────────────────────────────────────────

  private loadMeals(): void {
    this.load({
              moderationStatus: 'APPROVED',
              page: 0,
              size: this.pageSize(),
              sortBy: "name",
              sortDirection: 'ASC'
              });
  }

  // ─── Event handlers ───────────────────────────────────────

  onFilterChange(state: {
    query: string;
    subCategory: string;
    sort: string;
    page: number;
    filters: FilterState;
  }): void {
    // TODO: pass filters to the backend search endpoint
    console.log('[MarketplaceHomePage] filter change', state);
    this.load({
      moderationStatus: 'APPROVED',
      page: state.page,
      size: this.pageSize(),
      sortBy: state.sort,
      sortDirection: 'ASC',
      ...(state.query ? { keyword:state.query } : {}),
      ...(state.subCategory ? { cuisineIds:[state.subCategory] , dishTypeIds:[state.subCategory] } : {}),
      ...(state.filters && state.filters.maxPrice ? { maxPrice:state.filters.maxPrice } : {}),
     // ...(state.filters && state.filters.maxPrepTime ? { maxPrepTime:state.filters.maxPrepTime } : {}),
     // ...(state.filters && state.filters.availableOnly ? { availableOnly:state.filters.availableOnly } : {}),
      ...(state.filters && state.filters.minRating ? { minRating:state.filters.minRating } : {}),
      ...(state.filters && state.filters.maxPrice ? { maxPrice:state.filters.maxPrice } : {}),
      });

  }

  private load(q: MealSearchRequest): void {
    this.isLoading.set(true);
    this.mealService.search(q)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: page => {
          this.meals.set(page.content);
          this.totalMeals.set(page.totalElements);
          this.isLoading.set(false);
        },
        error: err => {
          this.isLoading.set(false);
          this.toast.show('Échec du chargement des catégories', 'error');
          console.error(err);
        },
      });
  }

  onAddToCart(meal: MealSummary): void {
    // Temporary implementation — replace with CartService.
    this.cartItemCount.update(c => c + 1);
    this.cartTotal.update(t => t + meal.price);
    this.cartVendorName.set(meal.vendorBusinessName);
    console.log('[MarketplaceHomePage] add to cart', meal.name);
  }

  onViewMealDetails(meal: MealSummary): void {
    this.router.navigate(['/meals', meal.id]);
  }

  onOpenCart(): void {
    // TODO: open cart drawer
    console.log('[MarketplaceHomePage] open cart');
  }
}
