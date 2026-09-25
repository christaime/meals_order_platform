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
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { IconComponent } from '@components/shared/icon/icon.component';
import { FormErrorComponent } from '@components/shared/form-error/form-error.component';
import { INPUT_CLASSES } from '@components/shared/form-field/input-classes';

import { LocationPillComponent } from '../location-pill/location-pill.component';
import { NewLocationFormComponent } from '@components/marketplace/location';

import { LOCATION_SERVICE } from '@app/core/services/marketplace/location.service';
import {
  Location,
  LocationSummary,
} from '@app/core/models/marketplace';

/**
 * Step 2 — Distribution location picker card.
 *
 * Lets the vendor:
 * 1. Search existing locations (with autocomplete dropdown)
 * 2. Add them to the meal's distribution list
 * 3. Remove them (via pills)
 * 4. Create brand-new locations inline (with map picker)
 *
 * The selection is stored in a parent-owned FormControl of type string[]
 * (list of location IDs). The card keeps a local cache of the
 * LocationSummary objects for rendering.
 */
@Component({
  selector: 'app-location-picker-card',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    IconComponent,
    FormErrorComponent,
    LocationPillComponent,
    NewLocationFormComponent,
  ],
  templateUrl: './location-picker-card.component.html',
  styleUrl: './location-picker-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LocationPickerCardComponent implements OnInit {

  private readonly locationService = inject(LOCATION_SERVICE);
  private readonly destroyRef = inject(DestroyRef);

  // ─── Inputs ───────────────────────────────────────────────
  /** FormControl holding the list of selected location IDs. */
  readonly control = input.required<FormControl<string[]>>();

  /** Optional error from the parent. */
  readonly error = input<string | null>(null);

  // ─── Outputs ──────────────────────────────────────────────
  /** Emits when the selection changes. */
  readonly selectionChange = output<string[]>();

  // ─── Exposed for the template ─────────────────────────────
  protected readonly INPUT_CLASSES = INPUT_CLASSES;

  // ─── Selected locations ───────────────────────────────────
  /** Current selected IDs (mirrored from the control). */
  readonly selectedIds = signal<string[]>([]);

  /**
   * Cache of the full LocationSummary objects for every selected ID.
   * The FormControl only knows the IDs — we keep the display data here.
   */
  private readonly locationCache = signal<Map<string, LocationSummary>>(
    new Map(),
  );

  /** Selected locations as full summaries, ordered by selection. */
  protected readonly selectedLocations = computed<LocationSummary[]>(() => {
    const cache = this.locationCache();
    return this.selectedIds()
      .map(id => cache.get(id))
      .filter((l): l is LocationSummary => !!l);
  });

  protected readonly selectedCount = computed(
    () => this.selectedIds().length,
  );

  // ─── Search ───────────────────────────────────────────────
  /** Text typed by the user in the search box. */
  readonly searchTerm = signal<string>('');

  /** Results from the API for the current search term. */
  private readonly searchResults = signal<LocationSummary[]>([]);

  /** Whether a search request is in flight. */
  protected readonly isSearchLoading = signal<boolean>(false);

  /** Filtered results — hide already-selected locations. */
  protected readonly visibleSearchResults = computed(() =>
    this.searchResults().filter(
      r => !this.selectedIds().includes(r.id),
    ),
  );

  /** True when the user has typed a long-enough search term. */
  protected readonly isSearching = computed(
    () => this.searchTerm().trim().length >= 2,
  );

  /** True when the search yielded no results. */
  protected readonly showNoResults = computed(
    () =>
      this.isSearching() &&
      !this.isSearchLoading() &&
      this.searchResults().length === 0,
  );

  // ─── Lifecycle ────────────────────────────────────────────

  ngOnInit(): void {
    const ctrl = this.control();

    // Seed the internal signal with the initial value.
    this.selectedIds.set(ctrl.value ?? []);

    // Keep in sync with external value changes (parent resets, form patch).
    ctrl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value: string[] | null) => {
        this.selectedIds.set(value ?? []);
      });

    // Prefetch the summaries for whatever was already selected.
    this.prefetchMissingSummaries(this.selectedIds());
  }

  // ─── Search flow ──────────────────────────────────────────

  protected onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchTerm.set(value);

    if (value.trim().length < 2) {
      this.searchResults.set([]);
      this.isSearchLoading.set(false);
      return;
    }

    this.isSearchLoading.set(true);
    this.triggerSearch(value.trim());
  }

  private searchTimer?: ReturnType<typeof setTimeout>;

  private triggerSearch(keyword: string): void {
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.locationService.searchLocationsFlat({ keyword, size: 10 })
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (results) => {
            this.searchResults.set(results);
            this.isSearchLoading.set(false);
          },
          error: (err) => {
            console.error('[LocationPicker] search error', err);
            this.searchResults.set([]);
            this.isSearchLoading.set(false);
          },
        });
    }, 250);
  }

  // ─── Actions ──────────────────────────────────────────────

  protected onAddResult(location: LocationSummary): void {
    this.addLocation(location);
    this.searchTerm.set('');
    this.searchResults.set([]);
  }

  protected onRemove(location: LocationSummary): void {
    const next = this.selectedIds().filter(id => id !== location.id);
    this.commitSelection(next);
  }

  protected onNewLocationCreated(location: Location): void {
    this.addLocation(location);
  }

  // ─── Helpers ──────────────────────────────────────────────

  private addLocation(location: Location | LocationSummary): void {
    if (this.selectedIds().includes(location.id)) return;

    const summary = this.toSummary(location);
    const cache = new Map(this.locationCache());
    cache.set(summary.id, summary);
    this.locationCache.set(cache);

    const nextIds = [...this.selectedIds(), summary.id];
    this.commitSelection(nextIds);
  }

  private commitSelection(ids: string[]): void {
    this.selectedIds.set(ids);
    this.control().setValue(ids);
    this.control().markAsTouched();
    this.selectionChange.emit(ids);
  }

  private toSummary(location: Location | LocationSummary): LocationSummary {
    return {
      id: location.id,
      name: location.name,
      address: location.address,
      moderationStatus: (location as any).moderationStatus ?? 'APPROVED',
    } as LocationSummary;
  }

  /**
   * Prefetch full summaries for any selected IDs that aren't in the cache.
   * Called once on init to hydrate the pills when editing an existing meal.
   */
  private prefetchMissingSummaries(ids: string[]): void {
    if (!ids.length) return;

    const cache = this.locationCache();
    const missing = ids.filter(id => !cache.has(id));
    if (!missing.length) return;

    this.locationService.getLocationsByIds(missing)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (locations) => {
          const next = new Map(this.locationCache());
          for (const loc of locations) {
            next.set(loc.id, this.toSummary(loc));
          }
          this.locationCache.set(next);
        },
        error: (err) => console.error('[LocationPicker] prefetch error', err),
      });
  }
}
