import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MealSummary } from '@core/models/marketplace';
import {
  IconComponent,
  BadgeComponent,
  RatingStarsComponent,
  PriceTagComponent,
} from '@components/shared';

/**
 * Meal Card — Marketplace product item representation.
 *
 * Responsibilities:
 * - Render meal thumbnail image with availability overlay
 * - Display primary vendor info (avatar initial & business name)
 * - Display core metadata: title, description, price, rating, prep time
 * - Render primary category badge derived from cuisine categories
 * - Emit quick action events (`addToCart` and `viewDetails`)
 *
 * Data flow:
 * - Input: `meal` (`MealSummary` read-only object from backend API)
 * - Outputs: `addToCart`, `viewDetails`
 */
@Component({
  selector: 'app-meal-card',
  standalone: true,
  imports: [
    CommonModule,
    IconComponent,
    BadgeComponent,
    RatingStarsComponent,
    PriceTagComponent,
  ],
  templateUrl: './meal-card.component.html',
  styleUrl: './meal-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MealCardComponent {
  // ─── Inputs & Outputs ──────────────────────────────────────────────
  /** The lightweight meal object to display. */
  readonly meal = input.required<MealSummary>();

  /** Emitted when the user clicks the "Commander" or quick-add button. */
  readonly addToCart = output<MealSummary>();

  /** Emitted when the card background or "Détails" button is clicked. */
  readonly viewDetails = output<MealSummary>();

  // ─── Derived State ────────────────────────────────────────────────
  /** Extracts the uppercase initial letter from the vendor's business name. */
  readonly vendorInitial = computed(() => {
    const name = this.meal().vendorBusinessName;
    return name ? name.charAt(0).toUpperCase() : 'V';
  });

  /** Returns the name of the first cuisine category attached to the meal, if any. */
  readonly primaryCuisine = computed(() => {
    const cuisines = this.meal().cuisines;
    return cuisines && cuisines.length > 0 ? cuisines[0].name : null;
  });

  /**
   * When true, the card is rendered in "preview" mode:
   * - No quick-add button
   * - No "Commander" / "Détails" buttons
   * - Cursor is not pointer
   *
   * Used by the meal editor to preview the card while editing.
   */
  readonly readonly = input<boolean>(false);

  // ─── User Actions ──────────────────────────────────────────────────
  /**
   * Triggers cart addition and prevents event bubbling up to card container.
   */
  onAddToCart(event: MouseEvent): void {
    event.stopPropagation();
    if (this.meal().isAvailable) {
      this.addToCart.emit(this.meal());
    }
  }

  /**
   * Emits signal to open detail view / navigate to meal page.
   */
  onViewDetails(): void {
    this.viewDetails.emit(this.meal());
  }
}
