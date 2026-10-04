import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IconComponent,
  PriceTagComponent,
  RatingStarsComponent,
} from '@components/shared';
import { Meal } from '@app/core/models/marketplace';

/**
 * Presentational meal detail view.
 *
 * Receives a fully-loaded {@link Meal} from the page and renders it.
 * No intermediate view-model — the model the API returns is the model
 * the view consumes.
 *
 * The template uses:
 *   - meal().cuisines              → category chips (primary color)
 *   - meal().dishTypes             → category chips (secondary color)
 *   - meal().ingredients           → ingredient chips, allergens flagged
 *   - meal().distributionLocations → pickup points
 *   - meal().supplements           → companion meals (currently unused)
 *   - meal().imageUrl              → single hero image (no gallery yet)
 */
@Component({
  selector: 'app-meal-detail-view',
  standalone: true,
  imports: [
    CommonModule,
    IconComponent,
    PriceTagComponent,
    RatingStarsComponent,
  ],
  templateUrl: './meal-detail-view.component.html',
  styleUrl: './meal-detail-view.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MealDetailViewComponent {

  // ─── Inputs & Outputs ──────────────────────────────────────
  readonly meal = input<Meal | null>(null);
  readonly isLoading = input<boolean>(false);

  readonly addToCart = output<{
    mealId: string;
    quantity: number;
    selectedOptions: string[];
    totalPrice: number;
  }>();
  readonly selectVendor = output<string>();

  // ─── Local State ───────────────────────────────────────────
  readonly quantity = signal<number>(1);

  /** Selected option ids. Options are not yet provided by the API,
   *  so this stays empty — kept for the future customization UI. */
  readonly selectedOptionIds = signal<Set<string>>(new Set());

  // ─── Derived ───────────────────────────────────────────────
  readonly hasCategories = computed<boolean>(() => {
    const m = this.meal();
    return !!m
      && ((m.cuisines?.length ?? 0) > 0 || (m.dishTypes?.length ?? 0) > 0);
  });

  readonly hasIngredients = computed<boolean>(() =>
    (this.meal()?.ingredients?.length ?? 0) > 0,
  );

  readonly hasLocations = computed<boolean>(() =>
    (this.meal()?.distributionLocations?.length ?? 0) > 0,
  );

  /** Extra price from selected options. Always 0 today. */
  readonly optionsTotalPrice = computed<number>(() => 0);

  readonly unitPrice = computed<number>(() =>
    (this.meal()?.price ?? 0) + this.optionsTotalPrice(),
  );

  readonly grandTotal = computed<number>(() =>
    this.unitPrice() * this.quantity(),
  );

  // ─── Handlers ──────────────────────────────────────────────
  onIncrement(): void {
    this.quantity.update((q) => q + 1);
  }

  onDecrement(): void {
    this.quantity.update((q) => (q > 1 ? q - 1 : 1));
  }

  onAddToCart(): void {
    const currentMeal = this.meal();
    if (!currentMeal) return;

    this.addToCart.emit({
      mealId: currentMeal.id,
      quantity: this.quantity(),
      selectedOptions: Array.from(this.selectedOptionIds()),
      totalPrice: this.grandTotal(),
    });
  }
}
