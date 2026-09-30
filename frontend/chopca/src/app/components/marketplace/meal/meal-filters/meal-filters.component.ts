import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  input,
  output,
  signal,
  effect
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';

import { IconComponent } from '@components/shared/icon/icon.component';
import {
  AdvancedFilterDrawerComponent,
  FilterState,
} from '@components/marketplace/meal/view';

import { CITY_SERVICE } from '@app/core/services/marketplace/city.service';
import { IngredientSummary } from '@app/core/models/marketplace/ingredient.model';
import { LocationSummary } from '@app/core/models/marketplace/location.model';
import { City } from '@app/core/models/marketplace/reference.model';
import { ModerationStatus } from '@app/core/models/marketplace/enum-type.model';

export type MealSort =
  | 'name-asc'
  | 'name-desc'
  | 'price-asc'
  | 'price-desc'
  | 'recent';

export type ModerationStatusFilter = ModerationStatus | 'ALL';

/**
 * The combined filter payload emitted by the bar.
 * Mirrors the fields the management page needs to build a MealSearchRequest.
 */
export interface MealFiltersValue {
  readonly name: string;
  readonly moderationStatus: ModerationStatusFilter;
  readonly cityId: string | null;
  readonly sort: MealSort;
  readonly advanced: FilterState;
}

/** Default advanced-filter state (delegated to the drawer's own defaults). */
const DEFAULT_ADVANCED: FilterState = {
  minPrice: 1000,
  maxPrice: 10000,
  maxPrepTime: 60,
  minRating: 0,
  availableOnly: false,
  cuisineIds: [],
  dishTypeIds: [],
  excludeIngredientIds: [],
  distributionLocationId: null,
};

/**
 * MealFiltersComponent — simple filter bar + embedded advanced drawer.
 *
 * Owns the four visible controls (name, status, city, sort) and the
 * AdvancedFilterDrawerComponent. Emits one combined `filtersChange`
 * whenever anything changes, so the host page only listens once.
 *
 * The host page owns the filter state. This component is a pure
 * function of its inputs plus its own transient draft state for the
 * text field.
 */
@Component({
  selector: 'app-meal-filters',
  standalone: true,
  imports: [FormsModule, IconComponent, AdvancedFilterDrawerComponent],
  templateUrl: './meal-filters.component.html',
  styleUrl: './meal-filters.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MealFiltersComponent implements OnInit {

  private readonly cityService = inject(CITY_SERVICE);
  private readonly destroyRef = inject(DestroyRef);

  // ─── Inputs (current state) ───────────────────────────────
  readonly name = input<string>('');
  readonly moderationStatus = input<ModerationStatusFilter>('ALL');
  readonly cityId = input<string | null>(null);
  readonly sort = input<MealSort>('name-asc');
  readonly advanced = input<FilterState>({ ...DEFAULT_ADVANCED });

  /** Option lists owned by the page (vendor-scoped). */
  readonly ingredientOptions = input<IngredientSummary[]>([]);
  readonly locationOptions = input<LocationSummary[]>([]);

  // ─── Outputs ──────────────────────────────────────────────
  readonly filtersChange = output<MealFiltersValue>();

  // ─── Cities ───────────────────────────────────────────────
  protected readonly cities = signal<City[]>([]);
  protected readonly citiesLoading = signal<boolean>(false);

  // ─── Draft for the text field (committed on Enter / blur) ─
  protected readonly draftName = signal<string>('');

  protected readonly statusOptions: { value: ModerationStatusFilter; label: string }[] = [
    { value: 'ALL', label: 'Tous les statuts' },
    { value: 'PENDING', label: 'En attente' },
    { value: 'APPROVED', label: 'Approuvé' },
    { value: 'REJECTED', label: 'Rejeté' },
    { value: 'DISABLED', label: 'Désactivé' },
  ];

  protected readonly sortOptions: { value: MealSort; label: string }[] = [
    { value: 'name-asc', label: 'Nom (A → Z)' },
    { value: 'name-desc', label: 'Nom (Z → A)' },
    { value: 'price-asc', label: 'Prix croissant' },
    { value: 'price-desc', label: 'Prix décroissant' },
    { value: 'recent', label: 'Plus récents' },
  ];

  constructor() {
    // Seed the name filter from the URL-bound input, once.
    effect(() => {
      const initial = this.name();
      if (initial && !this.draftName()) {
        this.draftName.set(initial);
      }
    }, { allowSignalWrites: true });
  }

  ngOnInit(): void {
    this.draftName.set(this.name());
    this.loadCities();
  }

  // ─── Handlers ─────────────────────────────────────────────

  protected onNameInput(event: Event): void {
    this.draftName.set((event.target as HTMLInputElement).value);
  }

  protected onNameSubmit(): void {
    this.emit({ name: this.draftName().trim() });
  }

  protected onStatusChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as ModerationStatusFilter;
    this.emit({ moderationStatus: value });
  }

  protected onCityChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.emit({ cityId: value === '' ? null : value });
  }

  protected onSortChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as MealSort;
    this.emit({ sort: value });
  }

  /**
   * The drawer emits the full advanced filter state on apply / reset.
   * We merge it into the outgoing payload.
   */
  protected onAdvancedChange(advanced: FilterState): void {
    this.emit({ advanced });
  }

  // ─── Helpers ──────────────────────────────────────────────

  /**
   * Merge a partial change into the current value and emit the result.
   * The host owns the state, so we always emit a complete payload.
   */
  private emit(patch: Partial<MealFiltersValue>): void {
    this.filtersChange.emit({
      name: patch.name ?? this.draftName().trim(),
      moderationStatus: patch.moderationStatus ?? this.moderationStatus(),
      cityId: patch.cityId !== undefined ? patch.cityId : this.cityId(),
      sort: patch.sort ?? this.sort(),
      advanced: patch.advanced ?? this.advanced(),
    });
  }

  private loadCities(): void {
    this.citiesLoading.set(true);
    this.cityService.getCities()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: cities => {
          this.cities.set(cities);
          this.citiesLoading.set(false);
        },
        error: err => {
          this.citiesLoading.set(false);
          console.error('[MealFilters] city fetch error', err);
        },
      });
  }
}
