import {
  Component,
  ChangeDetectionStrategy,
  model,
  signal,
  output,
  input,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { IconComponent } from '@components/shared/icon/icon.component';
import { CategoryPillsSelectorComponent } from '@components/shared/category-pills-selector/category-pills-selector.component';
import { IngredientSummary } from '@app/core/models/marketplace/ingredient.model';
import { LocationSummary } from '@app/core/models/marketplace/location.model';
import { Category } from '@app/core/models/marketplace';

/** Slider bounds — kept as constants so the two price sliders stay in sync. */
const PRICE_MIN  = 1000;
const PRICE_MAX  = 20000;
const PRICE_STEP = 500;

export interface FilterState {
  // ─── Base — used by the marketplace filters ───────────────────
  minPrice?: number;
  maxPrice?: number;
  maxPrepTime?: number;
  minRating?: number;
  availableOnly?: boolean | undefined;

  // ─── Meal management ──────────────────────────────────────────
  categoryIds?: string[];
  cuisineIds?: string[];
  dishTypeIds?: string[];
  excludeIngredientIds?: string[];
}

/**
 * Full selected entities, kept alongside the id-based {@link FilterState}
 * so the parent can render labels without a lookup.
 */
export interface FilterSelection {
  cuisines: Category[];
  dishTypes: Category[];
}

export const EMPTY_SELECTION: FilterSelection = {
  cuisines: [],
  dishTypes: [],
};

export const DEFAULT_FILTERS: FilterState = {
  minPrice: PRICE_MIN,
  maxPrice: 10000,
  maxPrepTime: 60,
  minRating: 0,
  availableOnly: false,
  categoryIds: [],
  cuisineIds: [],
  dishTypeIds: [],
  excludeIngredientIds: []
};

@Component({
  selector: 'app-advanced-filter-drawer',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    IconComponent,
    CategoryPillsSelectorComponent,
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

  // ─── Two-way state ────────────────────────────────────────────
  readonly isOpen = model<boolean>(false);
  readonly filters = model<FilterState>({ ...DEFAULT_FILTERS });

  /** Initial selection, supplied by the parent so the drawer opens
   *  with the correct pills already lit. */
  readonly selection = input<FilterSelection>(EMPTY_SELECTION);

  // ─── Host-provided options ────────────────────────────────────
  readonly ingredientOptions = input<IngredientSummary[]>([]);
  readonly locationOptions   = input<LocationSummary[]>([]);

  // ─── Outputs ──────────────────────────────────────────────────
  /** Emits the id-based filter state. */
  readonly applyFilters = output<FilterState>();

  /** Emits the full selected entities alongside the filter state. */
  readonly applySelection = output<FilterSelection>();

  /** Temporary draft state inside the drawer. */
  readonly draftFilters = signal<FilterState>({ ...this.filters() });
  private readonly draftSelection = signal<FilterSelection>({
    cuisines: [],
    dishTypes: [],
  });

  // ─── Form controls required by CategoryPillsSelectorComponent ─
  protected readonly cuisineControl  = new FormControl<string[]>([], { nonNullable: true });
  protected readonly dishTypeControl = new FormControl<string[]>([], { nonNullable: true });

  // ═════════════════════════════════════════════════════════════
  //  Open / close
  // ═════════════════════════════════════════════════════════════

  openDrawer(): void {
    let filtersToApply = { ...this.filters() };
    if(!filtersToApply.minPrice){
      filtersToApply = {...filtersToApply,minPrice: DEFAULT_FILTERS.minPrice};
    }
    if(!filtersToApply.maxPrice){
        filtersToApply = {...filtersToApply,maxPrice: DEFAULT_FILTERS.maxPrice};
    }
    if(!filtersToApply.maxPrepTime){
        filtersToApply = {...filtersToApply,maxPrepTime: DEFAULT_FILTERS.maxPrepTime};
    }
    if(!filtersToApply.minRating){
        filtersToApply = {...filtersToApply,minRating: DEFAULT_FILTERS.minRating};
    }
    this.draftFilters.set(filtersToApply);
    this.draftSelection.set({
      cuisines: [...this.selection().cuisines],
      dishTypes: [...this.selection().dishTypes],
    });
    this.cuisineControl.setValue(this.filters().cuisineIds ?? []);
    this.dishTypeControl.setValue(this.filters().dishTypeIds ?? []);

    this.isOpen.set(true);
  }

  closeDrawer(): void {
    this.isOpen.set(false);
  }

  // ═════════════════════════════════════════════════════════════
  //  Price handlers (mutually constrained)
  // ═════════════════════════════════════════════════════════════

  updateMinPrice(event: Event): void {
    const raw = Number((event.target as HTMLInputElement).value);
    this.draftFilters.update((f) => {
      const nextMin = Math.min(raw, (f.maxPrice || PRICE_MAX) - PRICE_STEP);
      return { ...f, minPrice: Math.max(PRICE_MIN, nextMin) };
    });
  }

  updateMaxPrice(event: Event): void {
    const raw = Number((event.target as HTMLInputElement).value);
    this.draftFilters.update((f) => {
      const nextMax = Math.max(raw, (f.minPrice || PRICE_MIN) + PRICE_STEP);
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

  toggleAvailableOnly(): void {
    this.draftFilters.update((f) => ({ ...f, availableOnly: !f.availableOnly }));
  }

  // ═════════════════════════════════════════════════════════════
  //  Category pills handlers — now capture the full objects
  // ═════════════════════════════════════════════════════════════

  onCuisinesSelected(cuisines: Category[]): void {
    const ids = cuisines.map((c) => c.id);
    this.draftSelection.update((s) => ({ ...s, cuisines }));
    this.draftFilters.update((f) => ({ ...f, cuisineIds: ids }));
  }

  onDishTypesSelected(dishTypes: Category[]): void {
    const ids = dishTypes.map((c) => c.id);
    this.draftSelection.update((s) => ({ ...s, dishTypes }));
    this.draftFilters.update((f) => ({ ...f, dishTypeIds: ids }));
  }

  // ═════════════════════════════════════════════════════════════
  //  Ingredient / location handlers
  // ═════════════════════════════════════════════════════════════

  toggleExcludeIngredient(id: string): void {
    this.draftFilters.update((f) => ({
      ...f,
      excludeIngredientIds: this.toggle(f.excludeIngredientIds, id),
    }));
  }

  isSelected(list: string[] | undefined, id: string): boolean {
    return !!list?.includes(id);
  }

  private toggle(list: string[] | undefined, id: string): string[] {
    const current = list ?? [];
    return current.includes(id)
      ? current.filter((x) => x !== id)
      : [...current, id];
  }

  // ═════════════════════════════════════════════════════════════
  //  Reset / Apply
  // ═════════════════════════════════════════════════════════════

  resetFilters(): void {
    const defaults: FilterState = { ...DEFAULT_FILTERS };
    const emptySelection: FilterSelection = { cuisines: [], dishTypes: [] };

    this.draftFilters.set(defaults);
    this.draftSelection.set(emptySelection);
    this.cuisineControl.setValue([]);
    this.dishTypeControl.setValue([]);
    this.filters.set(defaults);

    this.applyFilters.emit(defaults);
    this.applySelection.emit(emptySelection);
  }

  onApply(): void {
    const filters = { ...this.draftFilters() };
    const selection = { ...this.draftSelection() };

    this.filters.set(filters);

    this.applyFilters.emit(filters);
    this.applySelection.emit(selection);

    this.closeDrawer();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.isOpen()) {
      this.closeDrawer();
    }
  }
}
