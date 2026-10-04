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
  MealDetailViewComponent
} from '@components/marketplace/meal/view';

import { MEAL_SERVICE } from '@app/core/services/marketplace/meal.service';
import { Meal } from '@app/core/models/marketplace';

/**
 * Meal detail page.
 *
 * Responsibilities:
 * - Reads the meal ID from the route
 * - Fetches the full meal from the API
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
  readonly meal = signal<Meal | null>(null);
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
        this.meal.set(meal);
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

}
