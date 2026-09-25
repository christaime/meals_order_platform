import {
  Component,
  ChangeDetectionStrategy,
  signal,
  inject,
  OnInit,
} from '@angular/core';
import { Router } from '@angular/router';

import { MealCatalogViewComponent , QuickStatsPillsComponent,
  DeliveryCoverageSectionComponent, FloatingCartSummaryComponent } from '@components/marketplace/meal/view';
import { MEAL_SERVICE } from '@app/core/services/marketplace/meal.service';
import { MealSummary } from '@app/core/models/marketplace';

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
    this.isLoading.set(true);
    this.mealService.getMeals().subscribe({
      next: (meals) => {
        this.meals.set(meals);
        this.totalMeals.set(meals.length);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('[MarketplaceHomePage] meals fetch error', err);
        this.meals.set([]);
        this.totalMeals.set(0);
        this.isLoading.set(false);
      },
    });
  }

  // ─── Event handlers ───────────────────────────────────────

  onFilterChange(state: {
    query: string;
    subCategory: string;
    sort: string;
    page: number;
    filters: unknown;
  }): void {
    // TODO: pass filters to the backend search endpoint
    console.log('[MarketplaceHomePage] filter change', state);
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
