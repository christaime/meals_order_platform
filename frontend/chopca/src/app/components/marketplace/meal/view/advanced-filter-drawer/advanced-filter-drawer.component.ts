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
import {
  CategoryPillsSelectorComponent,
} from '@components/shared/category-pills-selector/category-pills-selector.component';
import { IngredientSummary } from '@app/core/models/marketplace/ingredient.model';
import { LocationSummary } from '@app/core/models/marketplace/location.model';

/** Slider bounds — kept as constants so the two price sliders stay in sync. */
const PRICE_MIN  = 1000;
const PRICE_MAX  = 20000;
const PRICE_STEP = 500;

export interface FilterState {
  // ─── Base — used by the marketplace filters ───────────────────
  minPrice: number;
  maxPrice: number;
  maxPrepTime: number;
  minRating: number;
  availableOnly: boolean;

  // ─── Meal management ──────────────────────────────────────────
  cuisineIds?: string[];
  dishTypeIds?: string[];
  excludeIngredientIds?: string[];
  distributionLocationId?: string | null;
}

/** Defaults used by `resetFilters()` and the initial `filters` model. */
const DEFAULT_FILTERS: FilterState = {
  minPrice: PRICE_MIN,
  maxPrice: 10000,          // preserved from the previous default
  maxPrepTime: 60,
  minRating: 0,
  availableOnly: false,
  cuisineIds: [],
  dishTypeIds: [],
  excludeIngredientIds: [],
  distributionLocationId: null,
};

/**
 * AdvancedFilterDrawer — Collapsible side drawer for fine-grained filtering.
 *
 * Base fields (price range, prep time, rating, availability) serve the
 * marketplace/meals-catalog filters. The meal-management fields
 * (cuisineIds, dishTypeIds, excludeIngredientIds, distributionLocationId)
 * are ignored by pages that don't pass ingredient/location options.
 *
 * Cuisines and dish-types are rendered with `CategoryPillsSelectorComponent`,
 * which fetches its own options. Ingredient exclusion and distribution-
 * location selection have no shared component, so the host page passes
 * those lists in via `ingredientOptions` / `locationOptions`.
 */
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
  // ─── Expose slider bounds to the template ─────────────────────
  protected readonly priceMin  = PRICE_MIN;
  protected readonly priceMax  = PRICE_MAX;
  protected readonly priceStep = PRICE_STEP;

  // ─── Two-way state ────────────────────────────────────────────
  readonly isOpen = model<boolean>(false);
  readonly filters = model<FilterState>({ ...DEFAULT_FILTERS });

  // ─── Option inputs (host-provided) ────────────────────────────
  readonly ingredientOptions = input<IngredientSummary[]>([]);
  readonly locationOptions   = input<LocationSummary[]>([]);

  /** Emitted when filters are applied. */
  readonly applyFilters = output<FilterState>();

  /** Temporary draft filter state inside the drawer. */
  readonly draftFilters = signal<FilterState>({ ...this.filters() });

  // ─── Form controls required by CategoryPillsSelectorComponent ─
  protected readonly cuisineControl  = new FormControl<string[]>([], { nonNullable: true });
  protected readonly dishTypeControl = new FormControl<string[]>([], { nonNullable: true });

  // ─── Lifecycle-ish ────────────────────────────────────────────
  openDrawer(): void {
    this.draftFilters.set({ ...this.filters() });
    this.cuisineControl.setValue(this.filters().cuisineIds ?? []);
    this.dishTypeControl.setValue(this.filters().dishTypeIds ?? []);
    this.isOpen.set(true);
  }

  closeDrawer(): void {
    this.isOpen.set(false);
  }

  // ─── Price handlers (mutually constrained) ────────────────────
  updateMinPrice(event: Event): void {
    const raw = Number((event.target as HTMLInputElement).value);
    this.draftFilters.update((f) => {
      const nextMin = Math.min(raw, f.maxPrice - PRICE_STEP);
      return { ...f, minPrice: Math.max(PRICE_MIN, nextMin) };
    });
  }

  updateMaxPrice(event: Event): void {
    const raw = Number((event.target as HTMLInputElement).value);
    this.draftFilters.update((f) => {
      const nextMax = Math.max(raw, f.minPrice + PRICE_STEP);
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

  // ─── Category pills handlers ──────────────────────────────────
  onCuisinesChange(ids: string[]): void {
    this.draftFilters.update((f) => ({ ...f, cuisineIds: ids }));
  }

  onDishTypesChange(ids: string[]): void {
    this.draftFilters.update((f) => ({ ...f, dishTypeIds: ids }));
  }

  // ─── Ingredient / location handlers ───────────────────────────
  toggleExcludeIngredient(id: string): void {
    this.draftFilters.update((f) => ({
      ...f,
      excludeIngredientIds: this.toggle(f.excludeIngredientIds, id),
    }));
  }

  setDistributionLocation(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.draftFilters.update((f) => ({
      ...f,
      distributionLocationId: value === '' ? null : value,
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

  // ─── Reset / Apply ────────────────────────────────────────────
  resetFilters(): void {
    const defaults: FilterState = { ...DEFAULT_FILTERS };
    this.draftFilters.set(defaults);
    this.cuisineControl.setValue([]);
    this.dishTypeControl.setValue([]);
    this.filters.set(defaults);
    this.applyFilters.emit(defaults);
  }

  onApply(): void {
    this.filters.set({ ...this.draftFilters() });
    this.applyFilters.emit(this.filters());
    this.closeDrawer();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.isOpen()) {
      this.closeDrawer();
    }
  }
}
