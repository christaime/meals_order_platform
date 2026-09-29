import {
  Component,
  ChangeDetectionStrategy,
  signal,
  inject,
  input,
  OnInit,
  effect
} from '@angular/core';
import { Router } from '@angular/router';

import {
  MealDetailViewComponent,
  MealDetail,
} from '@components/marketplace/meal/view';

import { MEAL_SERVICE } from '@app/core/services/marketplace/meal.service';
import { Meal } from '@app/core/models/marketplace';

/**
 * Meal detail page.
 *
 * Responsibilities:
 * - Reads the meal ID from the route
 * - Fetches the full meal from the API
 * - Transforms the backend Meal model into the view's MealDetail shape
 * - Passes data to MealDetailViewComponent
 * - Handles "add to cart" and "view vendor" navigation
 *
 * Route param binding requires `withComponentInputBinding()` in app.config.ts.
 * If not enabled, switch to ActivatedRoute (see comment below).
 */
@Component({
  selector: 'app-meal-detail-page',
  standalone: true,
  imports: [MealDetailViewComponent],
  templateUrl: './meal-detail.page.html',
  styleUrl: './meal-detail.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MealDetailPageComponent implements OnInit {

  /** Route parameter — bound via `withComponentInputBinding()`. */
  readonly id = input.required<string>();

  private readonly mealService = inject(MEAL_SERVICE);
  private readonly router = inject(Router);

  // ─── State ────────────────────────────────────────────────
  readonly meal = signal<MealDetail | null>(null);
  readonly isLoading = signal<boolean>(true);

  constructor() {
    effect(() => {
      let mealId: string;
      try {
        mealId = this.id();
      } catch {
        return;   // input not bound yet — effect will re-run when it is
      }
      this.loadMeal(mealId);
    });
  }
  // ─── Lifecycle ────────────────────────────────────────────

  ngOnInit(): void {

  }

  // ─── Data loading ─────────────────────────────────────────

  private loadMeal(id: string): void {
    this.isLoading.set(true);

    this.mealService.getMealById(id).subscribe({
      next: (meal) => {
        this.meal.set(this.toDetailViewModel(meal));
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('[MealDetailPage] fetch error', err);
        // On error (e.g. 404), navigate back to the catalog
        this.router.navigate(['/meals']);
      },
    });
  }

  // ─── Event handlers ───────────────────────────────────────

  onAddToCart(event: {
    mealId: string;
    quantity: number;
    selectedOptions: string[];
    totalPrice: number;
  }): void {
    // TODO: delegate to CartService
    console.log('[MealDetailPage] add to cart', event);
  }

  onSelectVendor(vendorId: string): void {
    this.router.navigate(['/meals/restaurant', vendorId]);
  }

  // ─── Transform: backend Meal → view MealDetail ────────────

  /**
   * Converts the backend Meal model into the MealDetail shape
   * expected by MealDetailViewComponent.
   *
   * Mapping notes:
   * - `price` → `basePrice`
   * - `imageUrl` (single) → `images` (array with one entry)
   * - `averageRating` / `totalRatings` → `rating` / `reviewCount`
   * - `vendorId` + `vendorBusinessName` → `vendor` object
   * - `ingredients` (allergens) → `allergens` string array
   * - `optionGroups` — NOT YET IN THE BACKEND. Empty for now.
   */
  private toDetailViewModel(meal: Meal): MealDetail {
    return {
      id: meal.id,
      name: meal.name,
      description: meal.description ?? '',
      basePrice: meal.price,
      images: meal.imageUrl ? [meal.imageUrl] : [],
      rating: meal.averageRating,
      reviewCount: meal.totalRatings,
      preparationTimeMinutes: meal.prepTimeMinutes ?? 0,
      isAvailable: meal.isAvailable,
      vendor: {
        id: meal.vendorId,
        name: meal.vendorBusinessName,
        logoUrl: undefined,       // not available on MealSummary/Meal
        rating: 0,                // not available on Meal
      },
      allergens: meal.ingredients
        ?.filter(i => i.isAllergen)
        .map(i => i.name) ?? [],
      optionGroups: [],           // not yet in the backend model
    };
  }
}
