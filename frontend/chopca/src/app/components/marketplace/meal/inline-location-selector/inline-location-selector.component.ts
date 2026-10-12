import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  inject,
  input,
  output,
  signal,
  computed,
  viewChild,
  ElementRef
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, of } from 'rxjs';
import {
  debounceTime,
  distinctUntilChanged,
  switchMap,
  catchError,
} from 'rxjs/operators';

import { IconComponent } from '@components/shared/icon/icon.component';
import { CITY_SERVICE } from '@app/core/services/marketplace/city.service';
import { LOCATION_SERVICE } from '@app/core/services/marketplace/location.service';
import { City } from '@app/core/models/marketplace/city.model';
import { LocationSummary } from '@app/core/models/marketplace/location.model';

const SEARCH_DEBOUNCE_MS = 250;
const SEARCH_RESULT_LIMIT = 10;
const MAX_SELECTED_LOCATIONS = 2;

/**
 * Pick a city, then pick up to N distribution locations in that city.
 *
 * - The city select scopes the location search.
 * - When the city changes to a different one, any selected location
 *   that does not belong to the new city is removed.
 * - The location chip selector is a keyword → search → dropdown
 *   autocomplete, limited to `maxLocations` selections.
 * - `vendorId` scopes the search to a vendor's own locations when set.
 *
 * The component is a pure function of its inputs; it does not own
 * the committed selection. Parents that want to pre-select pass the
 * ids back in via `selectedLocationIds`.
 */
@Component({
  selector: 'app-inline-location-selector',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  templateUrl: './inline-location-selector.component.html',
  styleUrl: './inline-location-selector.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InlineLocationSelectorComponent implements OnInit {

  private readonly cityService = inject(CITY_SERVICE);
  private readonly locationService = inject(LOCATION_SERVICE);
  private readonly destroyRef = inject(DestroyRef);

  // ─── Inputs ───────────────────────────────────────────────
  /** When set, the location search is scoped to this vendor. */
  readonly vendorId = input<string | null>(null);

  /** Pre-selected city id, if the parent has one. */
  readonly selectedCityId = input<string | null>(null);

  /** Pre-selected location ids, if the parent has some. */
  readonly selectedLocationIdsInput = input<string[]>([], { alias: 'selectedLocationIds' });

  /** Maximum number of locations a user can pick. */
  readonly maxLocations = input<number>(MAX_SELECTED_LOCATIONS);

  // ─── Outputs ──────────────────────────────────────────────
  /** Emitted when the city changes. Null when cleared. */
  readonly citySelected = output<City | null>();

  /** Emitted when the selected locations change. */
  readonly locationsSelected = output<LocationSummary[]>();

  // ─── City state ───────────────────────────────────────────
  protected readonly cities = signal<City[]>([]);
  protected readonly citiesLoading = signal<boolean>(false);
  protected readonly cityId = signal<string | null>(null);

  // ─── Location search state ────────────────────────────────
  protected readonly locationInput = signal<string>('');
  private readonly locationSearch$ = new Subject<string>();
  protected readonly locationResults = signal<LocationSummary[]>([]);
  protected readonly locationIsSearching = signal<boolean>(false);
  protected readonly locationDropdownOpen = signal<boolean>(false);

  /** Cached objects for chips, seeded by addLocation. */
  private readonly locationCache = signal<Map<string, LocationSummary>>(new Map());

  /** Committed ids, mirrored from the input. */
  protected readonly selectedIds = signal<string[]>([]);

  /** Resolved chip objects. */
  protected readonly selectedLocations = computed<LocationSummary[]>(() => {
    const ids = this.selectedIds();
    if (ids.length === 0) return [];
    const cache = this.locationCache();
    const out: LocationSummary[] = [];
    for (const id of ids) {
      const found = cache.get(id);
      if (found) out.push(found);
    }
    return out;
  });

  /** Set of selected ids, for O(1) membership checks. */
  protected readonly selectedIdSet = computed(() => new Set(this.selectedIds()));

  /** Results not already selected. */
  protected readonly availableResults = computed(() => {
    const picked = this.selectedIdSet();
    return this.locationResults().filter((loc) => !picked.has(loc.id));
  });

  protected readonly atLimit = computed(
    () => this.selectedIds().length >= this.maxLocations(),
  );

  // ─── Lifecycle ────────────────────────────────────────────

  constructor() {
    this.locationSearch$
      .pipe(
        debounceTime(SEARCH_DEBOUNCE_MS),
        distinctUntilChanged(),
        switchMap((term) => {
          const trimmed = term.trim();
          if (trimmed.length === 0) {
            this.locationIsSearching.set(false);
            return of<LocationSummary[]>([]);
          }
          this.locationIsSearching.set(true);
          return this.locationService.searchLocationsFlat({
            keyword: trimmed,
            cityNameLike: trimmed,
            size: SEARCH_RESULT_LIMIT,
            ...(this.vendorId() ? { vendorId: this.vendorId()! } : {}),
            ...(this.cityId() ? { cityIds: [this.cityId()!] } : {}),
          }).pipe(
            catchError((err) => {
              console.error('[InlineLocationSelector] location search failed', err);
              return of<LocationSummary[]>([]);
            }),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((content) => {
        this.locationResults.set(content);
        this.locationIsSearching.set(false);
        // Open the panel whenever a search completed for non-empty input,
        // even if the result set is empty — the empty state renders inside.
        this.locationDropdownOpen.set(this.locationInput().trim().length > 0);
      });
  }

  ngOnInit(): void {
    this.cityId.set(this.selectedCityId());
    this.selectedIds.set([...this.selectedLocationIdsInput()]);
    this.loadCities();
  }


  // ─── City ─────────────────────────────────────────────────

  protected onCityChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    const nextId = value === '' ? null : value;
    const previousId = this.cityId();

    if (nextId === previousId) return;

    this.cityId.set(nextId);

    const city = nextId ? this.cities().find((c) => c.id === nextId) ?? null : null;
    this.citySelected.emit(city);

    // Prune selected locations that don't belong to the new city.
    //
    // - Clearing the city ("Toutes les villes") removes the constraint,
    //   so nothing needs pruning.
    // - Setting a city removes any selected location whose city is not
    //   the new one.
    if (nextId !== null) {
      const keptIds = this.selectedIds().filter((id) => {
        const loc = this.locationCache().get(id);
        // If the object isn't cached, we can't tell which city it's in;
        // drop it to be safe. The parent can re-add it if they want.
        if (!loc) return false;
        return loc.city?.id === nextId;
      });

      if (keptIds.length !== this.selectedIds().length) {
        this.selectedIds.set(keptIds);
        this.locationsSelected.emit(
          keptIds.map((id) => this.locationCache().get(id)!).filter(Boolean),
        );
      }
    }

    // Re-run the search with the new city scope, if the user was typing.
    if (this.locationInput().trim().length > 0) {
      this.locationSearch$.next(this.locationInput());
    }
  }

  // ─── Location search ──────────────────────────────────────

  protected onLocationInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.locationInput.set(value);
    this.locationSearch$.next(value);
  }

  protected onLocationFocus(): void {
    if (this.locationResults().length > 0) {
      this.locationDropdownOpen.set(true);
    }
  }

  protected onLocationBlur(): void {
    setTimeout(() => this.locationDropdownOpen.set(false), 150);
  }

  protected onLocationKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      const first = this.availableResults()[0];
      if (first) this.addLocation(first);
    } else if (event.key === 'Escape') {
      this.locationDropdownOpen.set(false);
    }
  }

  protected addLocation(location: LocationSummary): void {
    if (this.atLimit()) return;
    if (this.selectedIdSet().has(location.id)) return;

    this.locationCache.update((m) => {
      const next = new Map(m);
      next.set(location.id, location);
      return next;
    });

    const nextIds = [...this.selectedIds(), location.id];
    this.selectedIds.set(nextIds);
    this.locationsSelected.emit(
      nextIds.map((id) => this.locationCache().get(id)!).filter(Boolean),
    );

    this.locationInput.set('');
    this.locationResults.set([]);
    this.locationDropdownOpen.set(false);
  }

  protected removeLocation(location: LocationSummary): void {
    const nextIds = this.selectedIds().filter((id) => id !== location.id);
    this.selectedIds.set(nextIds);
    this.locationsSelected.emit(
      nextIds.map((id) => this.locationCache().get(id)!).filter(Boolean),
    );
  }

  // ─── Helpers ──────────────────────────────────────────────

  private loadCities(): void {
    this.citiesLoading.set(true);
    this.cityService.getCities()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (cities) => {
          this.cities.set(cities);
          this.citiesLoading.set(false);
        },
        error: (err) => {
          this.citiesLoading.set(false);
          console.error('[InlineLocationSelector] city fetch error', err);
        },
      });
  }
}
