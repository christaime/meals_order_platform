import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  signal,
  computed,
  inject,
  OnInit,
  DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';

import { Category, MealSummary, MealStatFilter } from '@core/models/marketplace';
import { IngredientSummary } from '@app/core/models/marketplace/ingredient.model';
import { LocationSummary } from '@app/core/models/marketplace/location.model';

import { IconComponent } from '@components/shared';
import { LocationSelectorComponent } from '@components/shared/location-selector/location-selector.component';
import { SearchBarComponent } from '@components/shared/search-bar/search-bar.component';
import { SubCategoryFilterChipsComponent , SubCategoryChip} from '../sub-category-filter-chips/sub-category-filter-chips.component';
import { ActiveFilterBadgesComponent, ActiveFilterItem } from '../active-filter-badges/active-filter-badges.component';
import { SortDropdownComponent, SortOption } from '@components/shared/sort-dropdown/sort-dropdown.component';
import {
  AdvancedFilterDrawerComponent,
  FilterState,
  FilterSelection,
} from '../advanced-filter-drawer/advanced-filter-drawer.component';
import { MealCardComponent } from '../meal-card/meal-card.component';
import { MealCardSkeletonComponent } from '../meal-card-skeleton/meal-card-skeleton.component';
import { PaginationControlsComponent } from '../pagination-controls/pagination-controls.component';
import { REFERENCE_SERVICE } from '@core/services/marketplace';

const DEFAULT_CHIP: SubCategoryChip = {
  id: 'all',
  name: 'Tous les types',
  kind: 'ALL',
};

export const EMPTY_ADVANCE_FILTERS: FilterState = {
  minPrice: undefined,
  maxPrice: undefined,
  maxPrepTime: undefined,
  minRating: undefined,
  categoryIds: [],
  cuisineIds: [],
  dishTypeIds: [],
  excludeIngredientIds: []
};
/**
 * Public meal catalog view.
 *
 * Owns every filter source: the search bar, the sub-category chips,
 * the sort dropdown, and the advanced filter drawer. Emits a single
 * `filterChange` event that the host page translates into an API
 * request.
 *
 * Filter sources and how they interact:
 *  - The shortcut chips (`express`, `eco`) are aliases for two drawer
 *    fields (`maxPrepTime`, `maxPrice`). Selecting a chip writes the
 *    field; the chip is deselected if the user later picks a
 *    different value in the drawer.
 *  - Cuisine and dish-type chips are shortcuts for the corresponding
 *    drawer pills. Both write to the same id lists, and
 *    `activeFilterItems` dedupes the display.
 */
@Component({
  selector: 'app-meal-catalog-view',
  standalone: true,
  imports: [
    CommonModule,
    IconComponent,
    SearchBarComponent,
    SubCategoryFilterChipsComponent,
    ActiveFilterBadgesComponent,
    SortDropdownComponent,
    AdvancedFilterDrawerComponent,
    MealCardComponent,
    MealCardSkeletonComponent,
    PaginationControlsComponent,
    LocationSelectorComponent
  ],
  templateUrl: './meal-catalog-view.component.html',
  styleUrl: './meal-catalog-view.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MealCatalogViewComponent implements OnInit {

  private readonly referenceService = inject(REFERENCE_SERVICE);
  private readonly destroyRef = inject(DestroyRef);

  // ═════════════════════════════════════════════════════════════
  //  Inputs & Outputs
  // ═════════════════════════════════════════════════════════════

  readonly meals = input<MealSummary[] | null>(null);
  readonly isLoading = input<boolean>(false);
  readonly totalMeals = input<number>(0);
  readonly pageSize = input<number>(12);

  readonly sortOptions:SortOption[] = [
      { id: 'averageRating', label: 'Mieux notés', icon: 'star' },
      { id: 'price-asc', label: 'Prix : Croissant', icon: 'arrow_upward' },
      { id: 'price-desc', label: 'Prix : Décroissant', icon: 'arrow_downward' },
      { id: 'prepTimeMinutes', label: 'Temps de préparation', icon: 'schedule' },
      { id: 'name', label: 'Nom des plats alphabetiquement', icon: 'sort_by_alpha' },
    ];
  /** Optional — the host can supply these to enable ingredient
   *  exclusion and distribution-location filters in the drawer. */
  readonly ingredientOptions = input<IngredientSummary[]>([]);
  readonly locationOptions = input<LocationSummary[]>([]);

  readonly addToCart = output<MealSummary>();
  readonly viewMealDetails = output<MealSummary>();
  readonly filterChange = output<{
    query: string;
    sort: string;
    page: number;
    distributionLocationIds?: string[];
    filters: FilterState;
  }>();

  // ═════════════════════════════════════════════════════════════
  //  State
  // ═════════════════════════════════════════════════════════════

  readonly searchQuery = signal<string>('');
  readonly selectedSubCategories = signal<SubCategoryChip[]>([]);
  readonly selectedSort = signal<string>('averageRating');
  readonly currentPage = signal<number>(1);
  readonly advancedFilters = signal<FilterState>({ ...EMPTY_ADVANCE_FILTERS });

  /** Selected distribution locations — fed into the meal search. */
  private readonly selectedLocationIds = signal<string[]>([]);

  /** The criteria the user last applied — kept so the panel can reopen. */
  private readonly locationCriteria = signal<{
    cityId: string;
    cityName: string;
    areaName?: string;
    latitude?: number;
    longitude?: number;
    radiusKm?: number;
  } | null>(null);

  /** Full objects the drawer emitted, kept for label rendering. */
  readonly drawerSelection = signal<FilterSelection>({
    cuisines: [],
    dishTypes: [],
    ingredients: []
  });

  protected readonly subCategoryOptions = signal<SubCategoryChip[]>([DEFAULT_CHIP]);

  /** Reference stats — used to derive shortcut values. */
  private mealStatFilters: MealStatFilter | undefined;

  // ═════════════════════════════════════════════════════════════
  //  Derived
  // ═════════════════════════════════════════════════════════════

  readonly skeletonArray = computed(() => Array.from({ length: this.pageSize() }));

  /** Ids of the currently selected chips — bound to the chips component. */
  protected readonly selectedSubCategoryIds = computed(() =>
    this.selectedSubCategories().map((c) => c.id));

  // ═════════════════════════════════════════════════════════════
  //  Active filter items — every filter source, deduped
  // ═════════════════════════════════════════════════════════════

  readonly activeFilterItems = computed<ActiveFilterItem[]>(() => {
    const list: ActiveFilterItem[] = [];
    const filters = this.advancedFilters();
    const chips = this.selectedSubCategories();
    // ── Search ────────────────────────────────────────────────
    if (this.searchQuery()) {
      list.push({
        key: 'query',
        label: `Recherche: "${this.searchQuery()}"`,
        value: this.searchQuery(),
      });
    }

    // ── Shortcut presence flags (used to dedupe below) ────────
    const hasExpress = chips.some((c) => c.kind === 'SHORTCUT' && c.id === 'express');
    const hasEco = chips.some((c) => c.kind === 'SHORTCUT' && c.id === 'eco');

    // ── Chips, routed by kind ─────────────────────────────────
    for (const chip of chips) {
      switch (chip.kind) {
        case 'ALL':
          break;

        case 'CUISINE':
          list.push({ key: 'cuisine', label: chip.name, value: chip.id });
          break;

        case 'DISH_TYPE':
          list.push({ key: 'dishType', label: chip.name, value: chip.id });
          break;

        case 'SHORTCUT':
          if (chip.id === 'express') {
            list.push({
              key: 'express',
              label: `Prépa ≤ ${this.shortcutValues().express ?? 30} min`,
              value: true,
            });
          } else if (chip.id === 'eco') {
            list.push({
              key: 'eco',
              label: `Max ${this.shortcutValues().eco ?? 0} FCFA`,
              value: true,
            });
          }
          break;
      }
    }

    // ── Drawer cuisines not already shown as a chip ───────────
    const chipCuisineIds = new Set(
      chips.filter((c) => c.kind === 'CUISINE').map((c) => c.id));
    for (const c of this.drawerSelection().cuisines) {
      if (chipCuisineIds.has(c.id)) continue;
      list.push({ key: 'cuisine', label: c.name, value: c.id });
    }

    // ── Drawer dish types not already shown as a chip ─────────
    const chipDishIds = new Set(
      chips.filter((c) => c.kind === 'DISH_TYPE').map((c) => c.id));
    for (const d of this.drawerSelection().dishTypes) {
      if (chipDishIds.has(d.id)) continue;
      list.push({ key: 'dishType', label: d.name, value: d.id });
    }

    // ── Price / time / rating / availability ──────────────────
    // Skip the maxPrepTime / maxPrice entries when the corresponding
    // shortcut chip already covers them — otherwise the same filter
    // shows up twice.
    if (filters.minPrice) {
      list.push({
        key: 'minPrice',
        label: `Min ${filters.minPrice} FCFA`,
        value: filters.minPrice,
      });
    }
    if (filters.maxPrice && !hasEco) {
      list.push({
        key: 'maxPrice',
        label: `Max ${filters.maxPrice} FCFA`,
        value: filters.maxPrice,
      });
    }
    if (filters.maxPrepTime && !hasExpress) {
      list.push({
        key: 'maxPrepTime',
        label: `Prépa ≤  ${filters.maxPrepTime} min`,
        value: filters.maxPrepTime,
      });
    }
    if (filters.minRating && filters.minRating > 0) {
      list.push({
        key: 'minRating',
        label: `${filters.minRating}+ ★`,
        value: filters.minRating,
      });
    }

    // ── Excluded ingredients ──────────────────────────────────
    for (const id of filters.excludeIngredientIds ?? []) {
      const ing = this.drawerSelection().ingredients.find((i) => i.id === id);
      list.push({
        key: 'excludeIngredient',
        label: `Sans ${ing?.name ?? 'ingrédient'}`,
        value: id,
      });
    }

    return list;
  });

  // ═════════════════════════════════════════════════════════════
  //  Lifecycle
  // ═════════════════════════════════════════════════════════════

  ngOnInit(): void {
    this.referenceService
      .getMealStatsFilters()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (stats) => {
          this.mealStatFilters = { ...stats };
          this.subCategoryOptions.set(this.toChips(stats));
        },
        error: (err) => console.error('[MealCatalog] failed to load stats', err),
      });
  }

  // ═════════════════════════════════════════════════════════════
  //  Chip building
  // ═════════════════════════════════════════════════════════════

  private toChips(stats: MealStatFilter): SubCategoryChip[] {
    const chips: SubCategoryChip[] = [DEFAULT_CHIP];

    for (const dish of stats.mostDemandedDish) {
      chips.push({
        id: dish.id,
        name: dish.name,
        count: dish.count,
        kind: 'DISH_TYPE',
      });
    }
    for (const cuisine of stats.mostDemandedCuisines) {
      chips.push({
        id: cuisine.id,
        name: cuisine.name,
        count: cuisine.count,
        kind: 'CUISINE',
      });
    }
    if (stats.expressPrepTimeInMinutes.count > 0) {
      chips.push({
        id: 'express',
        name: `Prépa ≤ ${stats.expressPrepTimeInMinutes.time} min`,
        count: stats.expressPrepTimeInMinutes.count,
        kind: 'SHORTCUT',
      });
    }
    if (stats.minMealPrice.count > 0) {
      chips.push({
        id: 'eco',
        name: `À partir de ${stats.minMealPrice.price} FCFA`,
        count: stats.minMealPrice.count,
        kind: 'SHORTCUT',
      });
    }
    return chips;
  }

  // ═════════════════════════════════════════════════════════════
  //  Event handlers
  // ═════════════════════════════════════════════════════════════

  onLocationsChange(locations: LocationSummary[]): void {
    this.selectedLocationIds.set(locations.map((l) => l.id));
    this.currentPage.set(1);
    this.emitState();
  }

  onCriteriaChange(criteria: {
    cityId: string;
    cityName: string;
    areaName?: string;
    latitude?: number;
    longitude?: number;
    radiusKm?: number;
  }): void {
    // Empty criteria means the user cleared the zone.
    const isEmpty = !criteria.cityId;
    this.locationCriteria.set(isEmpty ? null : criteria);
  }
  onSearchChange(query: string): void {
    this.searchQuery.set(query);
    this.currentPage.set(1);
    this.emitState();
  }

  onSubCategoryChange(selected: SubCategoryChip[]): void {
    const previous = this.selectedSubCategories();
    this.selectedSubCategories.set(selected);

    const prevIds = new Set(previous.map((c) => c.id));
    const nextIds = new Set(selected.map((c) => c.id));

    const added = selected.filter((c) => !prevIds.has(c.id));
    const removed = previous.filter((c) => !nextIds.has(c.id));

    this.advancedFilters.update((f) => {
      const cuisineIds = new Set(f.cuisineIds ?? []);
      const dishTypeIds = new Set(f.dishTypeIds ?? []);
      const ingredientIds = new Set(f.excludeIngredientIds ?? []);

      let maxPrepTime = f.maxPrepTime;
      let maxPrice = f.maxPrice;

      // Remove ids of deselected chips.
      for (const chip of removed) {
        if (chip.kind === 'CUISINE') cuisineIds.delete(chip.id);
        else if (chip.kind === 'DISH_TYPE') dishTypeIds.delete(chip.id);
        else if (chip.kind === 'SHORTCUT' && chip.id === 'express') maxPrepTime = 60;
        else if (chip.kind === 'SHORTCUT' && chip.id === 'eco') maxPrice = 10000;
      }

      // Add ids of newly selected chips.
      const { express, eco } = this.shortcutValues();
      for (const chip of added) {
        if (chip.kind === 'CUISINE') cuisineIds.add(chip.id);
        else if (chip.kind === 'DISH_TYPE') dishTypeIds.add(chip.id);
        else if (chip.kind === 'SHORTCUT' && chip.id === 'express' && express != null) {
          maxPrepTime = express;
        }
        else if (chip.kind === 'SHORTCUT' && chip.id === 'eco' && eco != null) {
          maxPrice = eco;
        }
      }

      return {
        ...f,
        cuisineIds: [...cuisineIds],
        dishTypeIds: [...dishTypeIds],
        excludeIngredientIds: [...ingredientIds],
        maxPrepTime,
        maxPrice,
      };
    });

    this.currentPage.set(1);
    this.emitState();
  }

  onApplyAdvancedFilters(filters: FilterState): void {
    this.advancedFilters.set(filters);

    // Drawer is authoritative over shortcut chips.
    this.deselectStaleShortcuts(filters);

    // Drawer is also authoritative over cuisine / dish-type chips:
    // any chip whose id is no longer in the drawer's list gets removed
    // from the chip selection, and vice versa — the chips that remain
    // must all still be present in the drawer's arrays.
    const cuisineIdsSet = new Set(filters.cuisineIds ?? []);
    const dishTypeIdsSet = new Set(filters.dishTypeIds ?? []);
    const knownSubCategoryOptions = new Map(this.subCategoryOptions().map((c) => [c.id, c]));
    this.selectedSubCategories.update((chips) =>{
          // 1. Drop chips the drawer no longer includes.
          const kept = chips.filter((chip) => {
            if (chip.kind === 'CUISINE') return cuisineIdsSet.has(chip.id);
            if (chip.kind === 'DISH_TYPE') return dishTypeIdsSet.has(chip.id);
            return true; // shortcuts handled elsewhere
          });

          // 2. Add chips for drawer-selected categories that are knownSubCategoryOptions
          //    shortcuts but not currently in the row.
          const presentIds = new Set(kept.map((c) => c.id));
          const added: SubCategoryChip[] = [];

          for (const cuisineId of cuisineIdsSet) {
            const chip = knownSubCategoryOptions.get(cuisineId);
            if (chip && chip.kind === 'CUISINE' && !presentIds.has(chip.id)) {
              added.push(chip);
              presentIds.add(chip.id);
            }
          }
          for (const dishId of dishTypeIdsSet) {
            const chip = knownSubCategoryOptions.get(dishId);
            if (chip && chip.kind === 'DISH_TYPE' && !presentIds.has(chip.id)) {
              added.push(chip);
              presentIds.add(chip.id);
            }
          }

          return [...kept, ...added];
      });

    this.currentPage.set(1);
    this.emitState();

  }

  onApplySelection(selection: FilterSelection): void {
    this.drawerSelection.set(selection);
  }

  onSortChange(sort: SortOption): void {
    this.selectedSort.set(sort.id);
    this.emitState();
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);
    this.emitState();
  }

  onRemoveFilter(filter: ActiveFilterItem): void {
    switch (filter.key) {
      case 'query':
        this.searchQuery.set('');
        break;

      case 'cuisine':
        this.selectedSubCategories.update((list) =>
          list.filter((c) => !(c.kind === 'CUISINE' && c.id === filter.value)));
        this.drawerSelection.update((s) => ({
          ...s,
          cuisines: s.cuisines.filter((c) => c.id !== filter.value),
        }));
        this.advancedFilters.update((f) => ({
          ...f,
          cuisineIds: (f.cuisineIds ?? []).filter((id) => id !== filter.value),
        }));
        break;

      case 'dishType':
        this.selectedSubCategories.update((list) =>
          list.filter((c) => !(c.kind === 'DISH_TYPE' && c.id === filter.value)));
        this.drawerSelection.update((s) => ({
          ...s,
          dishTypes: s.dishTypes.filter((d) => d.id !== filter.value),
        }));
        this.advancedFilters.update((f) => ({
          ...f,
          dishTypeIds: (f.dishTypeIds ?? []).filter((id) => id !== filter.value),
        }));
        break;

      // express and maxPrepTime are aliases — same underlying state.
      // Removing either clears both representations.
      case 'express':
      case 'maxPrepTime':
        this.selectedSubCategories.update((list) =>
          list.filter((c) => !(c.kind === 'SHORTCUT' && c.id === 'express')));
        this.advancedFilters.update((f) => ({ ...f, maxPrepTime: undefined }));
        break;

      // eco and maxPrice are aliases — same underlying state.
      case 'eco':
      case 'maxPrice':
        this.selectedSubCategories.update((list) =>
          list.filter((c) => !(c.kind === 'SHORTCUT' && c.id === 'eco')));
        this.advancedFilters.update((f) => ({ ...f, maxPrice: undefined }));
        break;

      case 'minPrice':
        this.advancedFilters.update((f) => ({ ...f, minPrice: undefined }));
        break;

      case 'minRating':
        this.advancedFilters.update((f) => ({ ...f, minRating: 0 }));
        break;

      case 'excludeIngredient':
        this.advancedFilters.update((f) => ({
          ...f,
          excludeIngredientIds: (f.excludeIngredientIds ?? []).filter(
            (id) => id !== filter.value,
          ),
        }));
        break;

    }

    this.emitState();
  }

  onClearAllFilters(): void {
    this.searchQuery.set('');
    this.selectedSubCategories.set([]);
    this.advancedFilters.set({ ...EMPTY_ADVANCE_FILTERS });
    this.drawerSelection.set({ cuisines: [], dishTypes: [], ingredients: [] });
    this.currentPage.set(1);
    this.emitState();
  }

  // ═════════════════════════════════════════════════════════════
  //  Private helpers
  // ═════════════════════════════════════════════════════════════

  /**
   * Single source of truth for the values the express and eco
   * shortcuts imply. `null` when the stats haven't loaded yet.
   */
  private shortcutValues(): { express: number | null; eco: number | null } {
    return {
      express: this.mealStatFilters?.expressPrepTimeInMinutes.time ?? null,
      eco: this.mealStatFilters?.minMealPrice.price ?? null,
    };
  }

  /**
   * Removes the express / eco shortcut chips from the selection when
   * the corresponding filter field no longer matches the value the
   * shortcut represents. The drawer is authoritative: any value the
   * user explicitly picks overrides the shortcut.
   */
  private deselectStaleShortcuts(filters: FilterState): void {
    const { express, eco } = this.shortcutValues();

    this.selectedSubCategories.update((chips) =>
      chips.filter((chip) => {
        if (chip.kind !== 'SHORTCUT') return true;

        if (chip.id === 'express') {
          // Keep the chip only if the drawer's maxPrepTime still
          // matches the express value (or the stats aren't loaded yet).
          return express == null || filters.maxPrepTime === express;
        }
        if (chip.id === 'eco') {
          return eco == null || filters.maxPrice === eco;
        }
        return true;
      }),
    );
  }

  private emitState(): void {
    this.filterChange.emit({
      query: this.searchQuery(),
      sort: this.selectedSort(),
      page: this.currentPage() - 1,
      distributionLocationIds: this.selectedLocationIds(),
      filters: this.advancedFilters(),
    });
  }
}
