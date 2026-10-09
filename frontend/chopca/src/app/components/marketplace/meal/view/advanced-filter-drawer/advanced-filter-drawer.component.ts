import {
  Component,
  ChangeDetectionStrategy,
  signal,
  output,
  input,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { IconComponent } from '@components/shared/icon/icon.component';
import { CategoryPillsSelectorComponent } from '@components/shared/category-pills-selector/category-pills-selector.component';
import { AppAmountPipe } from '@components/shared/pipes/app-amount.pipe';
import { IngredientAutocompleteComponent } from '@components/shared/ingredient-autocomplete/ingredient-autocomplete.component';

import { Category, IngredientSummary } from '@app/core/models/marketplace';

const PRICE_MIN  = 500;
const PRICE_MAX  = 20000;
const PRICE_STEP = 500;

/**
 * The filter state shared between the drawer and the parent.
 *
 * `availableOnly` is intentionally absent — availability is being
 * replaced by quantity tracking later.
 */
export interface FilterState {
  minPrice?: number;
  maxPrice?: number;
  maxPrepTime?: number;
  minRating?: number;

  categoryIds?: string[];
  cuisineIds?: string[];
  dishTypeIds?: string[];
  excludeIngredientIds?: string[];
}

/**
 * The full entities associated with the current filter state, kept
 * alongside the id-based {@link FilterState} so the parent can render
 * labels and cards without a lookup.
 */
export interface FilterSelection {
  cuisines: Category[];
  dishTypes: Category[];
  ingredients: IngredientSummary[];
}

export const EMPTY_SELECTION: FilterSelection = {
  cuisines: [],
  dishTypes: [],
  ingredients: [],
};

export const DEFAULT_FILTERS: FilterState = {
  minPrice: undefined,
  maxPrice: undefined,
  maxPrepTime: undefined,
  /**
   * `0` is the "Toutes" sentinel — it means "no minimum rating",
   * equivalent to `undefined`. Consumers must skip it:
   *  - activeFilterItems must not emit a badge for it
   *  - buildSearchParams must not send it
   *  - the search must not filter by it
   */
  minRating: 0,
  categoryIds: [],
  cuisineIds: [],
  dishTypeIds: [],
  excludeIngredientIds: [],
};

@Component({
  selector: 'app-advanced-filter-drawer',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    IconComponent,
    CategoryPillsSelectorComponent,
    IngredientAutocompleteComponent,
    AppAmountPipe,
  ],
  templateUrl: './advanced-filter-drawer.component.html',
  styleUrl: './advanced-filter-drawer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdvancedFilterDrawerComponent {

  // ─── Slider bounds exposed to the template ────────────────────
  protected readonly priceMin  = PRICE_MIN;
  protected readonly priceMax  = PRICE_MAX;
  protected readonly priceStep = PRICE_STEP;

  // ═════════════════════════════════════════════════════════════
  //  Inputs — the parent's committed state
  // ═════════════════════════════════════════════════════════════

  /** Filter ids the parent committed the last time Apply was pressed. */
  readonly initialFilter = input<FilterState>({});

  /** Full entities the parent committed the last time Apply was pressed. */
  readonly initialSelection = input<FilterSelection>(EMPTY_SELECTION);

  // ═════════════════════════════════════════════════════════════
  //  Outputs — emitted only on Apply
  // ═════════════════════════════════════════════════════════════

  /** Emits the id-based filter state on Apply. */
  readonly applyFilters = output<FilterState>();

  /** Emits the full selected entities on Apply. */
  readonly applySelection = output<FilterSelection>();

  // ═════════════════════════════════════════════════════════════
  //  Internal state — never exposed to the parent
  // ═════════════════════════════════════════════════════════════

  protected readonly isOpen = signal<boolean>(false);

  /**
   * The working copy of the filter state. Updated on every user
   * edit. Not a `model()` — nothing about this signal is visible to
   * the parent; the commit point is `onApply`.
   */
  protected readonly draftFilters = signal<FilterState>({ ...DEFAULT_FILTERS });

  /**
   * The working copy of the full selected entities. Kept in sync
   * with `draftFilters` (every id in `draftFilters` has a
   * corresponding entry here) so Apply can emit both without a
   * lookup.
   */
  protected readonly draftSelection = signal<FilterSelection>({
    cuisines: [],
    dishTypes: [],
    ingredients: [],
  });

  // ─── Form controls required by the pill selectors ────────────
  protected readonly cuisineControl  = new FormControl<string[]>([], { nonNullable: true });
  protected readonly dishTypeControl = new FormControl<string[]>([], { nonNullable: true });
  protected initialIngredients: IngredientSummary[] = [];

  // ═════════════════════════════════════════════════════════════
  //  Open / close
  // ═════════════════════════════════════════════════════════════

  openDrawer(): void {
    this.seedFromCommittedState();
    this.isOpen.set(true);
  }

  closeDrawer(): void {
    this.isOpen.set(false);
  }

  // ═════════════════════════════════════════════════════════════
  //  Price handlers — mutually constrained
  // ═════════════════════════════════════════════════════════════

  updateMinPrice(event: Event): void {
    const raw = Number((event.target as HTMLInputElement).value);
    this.draftFilters.update((f) => {
      const nextMin = Math.min(raw, (f.maxPrice ?? PRICE_MAX) - PRICE_STEP);
      return { ...f, minPrice: Math.max(PRICE_MIN, nextMin) };
    });
  }

  updateMaxPrice(event: Event): void {
    const raw = Number((event.target as HTMLInputElement).value);
    this.draftFilters.update((f) => {
      const nextMax = Math.max(raw, (f.minPrice ?? PRICE_MIN) + PRICE_STEP);
      return { ...f, maxPrice: Math.min(PRICE_MAX, nextMax) };
    });
  }

  updateMaxPrepTime(event: Event): void {
    const val = Number((event.target as HTMLInputElement).value);
    this.draftFilters.update((f) => ({ ...f, maxPrepTime: val }));
  }

  setMinRating(rating: number): void {
    this.draftFilters.update((f) => ({ ...f, minRating: rating }));
  }

  // ═════════════════════════════════════════════════════════════
  //  Category pills — keep draftFilters and draftSelection in sync
  // ═════════════════════════════════════════════════════════════

  onCuisinesSelected(cuisines: Category[]): void {
    const ids = cuisines.map((c) => c.id);
    this.draftFilters.update((f) => ({ ...f, cuisineIds: ids }));
    this.draftSelection.update((s) => ({ ...s, cuisines }));
  }

  onDishTypesSelected(dishTypes: Category[]): void {
    const ids = dishTypes.map((d) => d.id);
    this.draftFilters.update((f) => ({ ...f, dishTypeIds: ids }));
    this.draftSelection.update((s) => ({ ...s, dishTypes }));
  }

  // ═════════════════════════════════════════════════════════════
  //  Excluded ingredients — driven by the autocomplete component
  // ═════════════════════════════════════════════════════════════

  onExcludedIngredientsChange(ingredients: IngredientSummary[]): void {
    const ids = ingredients.map((i) => i.id);
    this.draftFilters.update((f) => ({ ...f, excludeIngredientIds: ids }));
    this.draftSelection.update((s) => ({ ...s, ingredients }));
  }

  // ═════════════════════════════════════════════════════════════
  //  Clear all — set every draft to the empty state.
  //
  //  Distinct from openDrawer(), which seeds the drafts from the
  //  parent's committed state. Does not emit; the user must still
  //  click Appliquer to commit.
  // ═════════════════════════════════════════════════════════════

  clearAll(): void {
    this.draftFilters.set({ ...DEFAULT_FILTERS });
    this.draftSelection.set({
      cuisines: [],
      dishTypes: [],
      ingredients: [],
    });

    // emitEvent: true — the pill selector mirrors this control via
    // valueChanges. With emitEvent: false its internal selectedIds
    // would keep the old values and the pills would stay selected.
    this.cuisineControl.setValue([]);
    this.dishTypeControl.setValue([]);

    this.initialIngredients = [];
  }

  /**
   * Seeds the drafts from the parent's last committed state. Called
   * on open so the drawer always shows what the parent currently has.
   */
  private seedFromCommittedState(): void {
    const merged: FilterState = {
      ...DEFAULT_FILTERS,
      ...this.initialFilter(),
    };
    this.draftFilters.set(merged);

    const details = this.initialSelection();

    this.draftSelection.set({
      cuisines: [...details.cuisines],
      dishTypes: [...details.dishTypes],
      ingredients: [...details.ingredients],
    });

    this.cuisineControl.setValue(merged.cuisineIds ?? [], { emitEvent: false });
    this.dishTypeControl.setValue(merged.dishTypeIds ?? [], { emitEvent: false });
    this.initialIngredients = [...details.ingredients];
  }

  // ═════════════════════════════════════════════════════════════
  //  Apply — the only point where the parent is notified
  // ═════════════════════════════════════════════════════════════

  onApply(): void {
    this.applyFilters.emit({ ...this.draftFilters() });
    this.applySelection.emit({ ...this.draftSelection() });
    this.closeDrawer();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.isOpen()) {
      this.closeDrawer();
    }
  }
}
