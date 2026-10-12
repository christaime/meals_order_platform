import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  input,
  output,
  signal,
  effect,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import { IconComponent } from '@components/shared/icon/icon.component';
import {
  AdvancedFilterDrawerComponent,
  FilterState,
  DEFAULT_FILTERS,
  FilterSelection,
} from '@components/marketplace/meal/view';
import { InlineLocationSelectorComponent } from '../inline-location-selector/inline-location-selector.component';

import { IngredientSummary } from '@app/core/models/marketplace/ingredient.model';
import { LocationSummary } from '@app/core/models/marketplace/location.model';
import { ModerationStatus } from '@app/core/models/marketplace/enum-type.model';
import { City } from '@app/core/models/marketplace/city.model';

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
  readonly distributionLocationIds: string[];
  readonly sort: MealSort;
  readonly advanced: FilterState;
}

/**
 * MealFiltersComponent — filter bar for the vendor management page.
 *
 * Owns the four visible controls (name, status, locations, sort) and
 * embeds the advanced drawer and the inline location selector.
 * Emits one combined `filtersChange` whenever anything changes, so the
 * host page only listens once.
 *
 * The host page owns the filter state. This component is a pure
 * function of its inputs plus its own transient draft state for the
 * name text field.
 */
@Component({
  selector: 'app-meal-filters',
  standalone: true,
  imports: [
    FormsModule,
    IconComponent,
    AdvancedFilterDrawerComponent,
    InlineLocationSelectorComponent,
  ],
  templateUrl: './meal-filters.component.html',
  styleUrl: './meal-filters.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MealFiltersComponent implements OnInit {

  // ─── Inputs (current state) ───────────────────────────────
  readonly name = input<string>('');
  readonly moderationStatus = input<ModerationStatusFilter>('ALL');
  readonly distributionLocationIds = input<string[]>([]);
  readonly sort = input<MealSort>('name-asc');
  readonly advanced = input<FilterState>({ ...DEFAULT_FILTERS });
  readonly initialSelection = signal<FilterSelection>({
    cuisines: [],
    dishTypes: [],
    ingredients: [],
  });

  /** When set, the location search is scoped to this vendor. */
  readonly vendorId = input<string | null>(null);

  /** Option lists owned by the page. */
  readonly ingredientOptions = input<IngredientSummary[]>([]);
  readonly locationOptions = input<LocationSummary[]>([]);

  // ─── Outputs ──────────────────────────────────────────────
  readonly filtersChange = output<MealFiltersValue>();

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
    });
  }

  ngOnInit(): void {
    this.draftName.set(this.name());
  }

  // ─── Name handlers ────────────────────────────────────────

  protected onNameInput(event: Event): void {
    this.draftName.set((event.target as HTMLInputElement).value);
  }

  protected onNameSubmit(): void {
    this.emit({ name: this.draftName().trim() });
  }

  // ─── Status / sort ────────────────────────────────────────

  protected onStatusChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as ModerationStatusFilter;
    this.emit({ moderationStatus: value });
  }

  protected onSortChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as MealSort;
    this.emit({ sort: value });
  }

  // ─── Location selector ────────────────────────────────────

  /**
   * The city is a scoping concern for the location search, not a meal
   * filter. If the host needs to filter meals by city too, add a
   * `cityId` field to MealFiltersValue and emit it from here.
   */
  protected onCitySelected(city: City | null): void {

  }

  protected onLocationsSelected(locations: LocationSummary[]): void {
    this.emit({ distributionLocationIds: locations.map((l) => l.id) });
  }

  // ─── Advanced drawer ──────────────────────────────────────

  protected onAdvancedChange(advanced: FilterState): void {
    this.emit({ advanced });
  }

  protected onAdvancedSelectionChange(advanced: FilterSelection): void {
    this.initialSelection.set(advanced);
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
      distributionLocationIds: patch.distributionLocationIds ?? this.distributionLocationIds(),
      sort: patch.sort ?? this.sort(),
      advanced: patch.advanced ?? this.advanced(),
    });
  }
}
