import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MealCard } from '@core/models/ai/chat.models';

/**
 * A single meal card in the chat.
 *
 * Two modes:
 *   - compact (default) — image, name, vendor, price, rating, prep time.
 *   - expanded — the compact fields plus description, pickup locations,
 *     and ingredients with allergen flags. Used for MEAL_DETAIL payloads.
 *
 * Emits `navigate` when the user clicks. The parent decides where to
 * route (typically the public meal detail page).
 */
@Component({
  selector: 'app-chat-meal-card',
  standalone: true,
  imports: [DecimalPipe, MatIconModule],
  templateUrl: './chat-meal-card.component.html',
  styleUrl: './chat-meal-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatMealCardComponent {

  readonly meal = input.required<MealCard>();
  readonly expanded = input<boolean>(false);

  readonly navigate = output<void>();

  /** True when the meal has at least one allergen ingredient. */
  protected readonly hasAllergens = computed<boolean>(() =>
    (this.meal().ingredients ?? []).some((i) => i.isAllergen),
  );

  /** True when the meal has pickup locations to show in expanded mode. */
  protected readonly hasLocations = computed<boolean>(() =>
    (this.meal().locations ?? []).length > 0,
  );

  /** True when the meal has ingredients to show in expanded mode. */
  protected readonly hasIngredients = computed<boolean>(() =>
    (this.meal().ingredients ?? []).length > 0,
  );

  protected onClick(): void {
    this.navigate.emit();
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.navigate.emit();
    }
  }
}
