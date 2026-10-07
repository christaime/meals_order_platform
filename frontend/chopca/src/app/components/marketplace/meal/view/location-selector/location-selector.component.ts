import {
  Component,
  ChangeDetectionStrategy,
  signal,
  input,
  output,
  inject,
  DestroyRef,
  ViewChild,
  NgZone,
  AfterViewInit,
  ElementRef,
  HostListener
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { GoogleMap, GoogleMapsModule } from '@angular/google-maps';

import { IconComponent } from '@components/shared/icon/icon.component';
import { LOCATION_SERVICE } from '@app/core/services/marketplace/location.service';
import { CITY_SERVICE } from '@app/core/services/marketplace/city.service';
import { CityCoordinatesService } from '@app/core/services/marketplace/city-coordinates.service';
import { GoogleMapsLoaderService } from '@app/core/services/google-maps-loader.service';
import {
  City,
  LocationSearchRequest,
  LocationSummary,
} from '@app/core/models/marketplace';

/** Radius bounds for the slider. */
const RADIUS_MIN = 1;
const RADIUS_MAX = 30;
const RADIUS_DEFAULT = 10;

/** Debounce window for the location search. */
const SEARCH_DEBOUNCE_MS = 400;

/**
 * LocationSelector — Picks a point on a map and returns the
 * distribution locations within a radius of it.
 *
 * The parent receives two outputs:
 *  - `locationsChange`  — the LocationSummary[] found
 *  - `criteriaChange`   — the { cityId, cityName, areaName?, point, radiusKm }
 *                         describing the selection, so the parent can
 *                         re-open the panel in the same state.
 *
 * `areaName` is a **UI-only label** resolved from Google's reverse
 * geocoder. It is never sent to the backend.
 */
@Component({
  selector: 'app-location-selector',
  standalone: true,
  imports: [
    CommonModule,
    IconComponent,
    GoogleMapsModule,
  ],
  templateUrl: './location-selector.component.html',
  styleUrl: './location-selector.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LocationSelectorComponent implements AfterViewInit {

  private readonly locationService = inject(LOCATION_SERVICE);
  private readonly cityService = inject(CITY_SERVICE);
  private readonly cityCoordinates = inject(CityCoordinatesService);
  private readonly mapsLoader = inject(GoogleMapsLoaderService);
  private readonly zone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild('searchAnchor') searchAnchor?: ElementRef<HTMLInputElement>;
  @ViewChild(GoogleMap) map?: GoogleMap;

  // ─── Configuration inputs ─────────────────────────────────────
  readonly defaultRadiusKm = input<number>(RADIUS_DEFAULT);

  // ─── Outputs ──────────────────────────────────────────────────
  readonly locationsChange = output<LocationSummary[]>();
  readonly criteriaChange = output<{
    cityId: string;
    cityName: string;
    areaName?: string;
    latitude?: number;
    longitude?: number;
    radiusKm?: number;
  }>();

  // ─── Public UI state ──────────────────────────────────────────
  protected readonly radiusMin = RADIUS_MIN;
  protected readonly radiusMax = RADIUS_MAX;

  protected readonly isOpen = signal<boolean>(false);
  protected readonly cities = signal<City[]>([]);

  /** The committed selection (what the closed button shows). */
  protected readonly committed = signal<CommittedSelection | null>(null);

  /** Draft state while the panel is open. */
  protected readonly draftCity = signal<City | null>(null);
  protected readonly draftPoint = signal<google.maps.LatLngLiteral | null>(null);
  protected readonly draftRadiusKm = signal<number>(RADIUS_DEFAULT);
  protected readonly draftAreaName = signal<string | null>(null);

  /** Live search results for the current draft. */
  protected readonly results = signal<LocationSummary[]>([]);
  protected readonly isSearching = signal<boolean>(false);

  /** Map configuration. */
  protected readonly mapCenter = signal<google.maps.LatLngLiteral>({
    lat: 3.8480, lng: 11.5021,
  });
  protected readonly mapZoom = signal<number>(12);
  protected readonly markerPosition = signal<google.maps.LatLngLiteral | null>(null);
  protected readonly circleCenter = signal<google.maps.LatLngLiteral | null>(null);
  protected readonly circleRadiusMeters = signal<number>(RADIUS_DEFAULT * 1000);

  protected readonly mapOptions = signal<google.maps.MapOptions | null>(null);
  protected readonly markerOptions = signal<google.maps.MarkerOptions | null>(null);
  protected readonly circleOptions = signal<google.maps.CircleOptions | null>(null);

  /** True once the maps API has loaded and map options are ready. */
  protected readonly mapReady = signal<boolean>(false);

  private geocoder?: google.maps.Geocoder;
  private searchHandle: ReturnType<typeof setTimeout> | null = null;
  private searchToken = 0;

  // ═════════════════════════════════════════════════════════════
  //  Lifecycle
  // ═════════════════════════════════════════════════════════════

  constructor() {
    this.cityService.getCities()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (cities) => this.cities.set(cities),
        error: (err) => console.error('[LocationSelector] cities error', err),
      });

    this.destroyRef.onDestroy(() => {
      if (this.searchHandle) clearTimeout(this.searchHandle);
    });
  }

  async ngAfterViewInit(): Promise<void> {
    // The Google Map lives inside an @if — it only appears when the
    // panel is open. We must load the API up front; the map itself
    // initializes when the panel renders and @ViewChild resolves.
    await this.mapsLoader.load();

    this.mapOptions.set({
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      zoomControl: true,
    });
    this.markerOptions.set({
      draggable: true,
      animation: google.maps.Animation.DROP,
    });
    this.circleOptions.set({
      fillColor: '#7C3AED',
      fillOpacity: 0.12,
      strokeColor: '#7C3AED',
      strokeOpacity: 0.6,
      strokeWeight: 2,
    });
    this.geocoder = new google.maps.Geocoder();
    this.mapReady.set(true);
  }

  // ═════════════════════════════════════════════════════════════
  //  Panel open / close
  // ═════════════════════════════════════════════════════════════
  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    if (!this.isOpen()) return;
    const target = event.target as HTMLElement;
    if (!target.closest('.location-selector-container')) {
      this.closePanel();
    }
  }
  protected openPanel(): void {
    const c = this.committed();
    this.draftCity.set(c?.city ?? null);
    this.draftPoint.set(c?.point ?? null);
    this.draftRadiusKm.set(c?.radiusKm ?? this.defaultRadiusKm());
    this.draftAreaName.set(c?.areaName ?? null);
    this.results.set(c?.locations ?? []);

    this.mapCenter.set(
      c?.point ?? this.cityCoordinates.getCoordinates(c?.city?.name ?? null),
    );
    this.markerPosition.set(c?.point ?? null);
    this.circleCenter.set(c?.point ?? null);
    this.circleRadiusMeters.set((c?.radiusKm ?? this.defaultRadiusKm()) * 1000);
    this.isOpen.set(true);

    // If the committed selection had a city but no point, we've just
    // restored the panel with that city; a fresh search will run when
    // the user clicks a point. If it had both, the results are already
    // in state — no re-fetch needed.
  }

  protected closePanel(): void {
    this.isOpen.set(false);
  }

  protected cancel(): void {
    // Discard the draft — the committed state is untouched.
    this.closePanel();
  }

  protected apply(): void {
    const city = this.draftCity();
    if (!city) return;

    const point = this.draftPoint();
    const radiusKm = this.draftRadiusKm();
    const areaName = this.draftAreaName() ?? undefined;
    const locations = this.results();

    const next: CommittedSelection = {
      city,
      point,
      radiusKm,
      areaName,
      locations,
    };
    this.committed.set(next);

    this.locationsChange.emit(locations);
    this.criteriaChange.emit({
      cityId: city.id,
      cityName: city.name,
      areaName,
      latitude: point?.lat,
      longitude: point?.lng,
      radiusKm,
    });

    this.closePanel();
  }

  protected clear(): void {
    this.committed.set(null);
    this.draftCity.set(null);
    this.draftPoint.set(null);
    this.draftRadiusKm.set(this.defaultRadiusKm());
    this.draftAreaName.set(null);
    this.results.set([]);
    this.markerPosition.set(null);
    this.circleCenter.set(null);

    this.locationsChange.emit([]);
    this.criteriaChange.emit({
      cityId: '',
      cityName: '',
      areaName: undefined,
      latitude: undefined,
      longitude: undefined,
      radiusKm: undefined,
    });
  }

  // ═════════════════════════════════════════════════════════════
  //  City selection
  // ═════════════════════════════════════════════════════════════

  protected onCityChange(event: Event): void {
    const id = (event.target as HTMLSelectElement).value;
    const city = this.cities().find((c) => c.id === id) ?? null;
    this.draftCity.set(city);

    // Changing the city clears the point: the previous coordinates
    // belong to another city.
    this.draftPoint.set(null);
    this.draftAreaName.set(null);
    this.markerPosition.set(null);
    this.circleCenter.set(null);

    if (!city) {
      this.results.set([]);
      return;
    }

    // Recenter the map.
    const center = this.cityCoordinates.getCoordinates(city.name);
    this.mapCenter.set(center);
    this.mapZoom.set(12);

    // Run a city-only search so the count is meaningful immediately.
    this.scheduleSearch({ cityOnly: true });
  }

  // ═════════════════════════════════════════════════════════════
  //  Map interaction
  // ═════════════════════════════════════════════════════════════

  protected onMapClick(event: google.maps.MapMouseEvent): void {
    if (!event.latLng) return;
    const point = { lat: event.latLng.lat(), lng: event.latLng.lng() };
    this.applyPoint(point);
  }

  protected onMarkerDragEnd(event: google.maps.MapMouseEvent): void {
    if (!event.latLng) return;
    const point = { lat: event.latLng.lat(), lng: event.latLng.lng() };
    this.applyPoint(point);
  }

  protected onRadiusChange(event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    this.draftRadiusKm.set(value);
    this.circleRadiusMeters.set(value * 1000);
    this.scheduleSearch();
  }

  private applyPoint(point: google.maps.LatLngLiteral): void {
    this.draftPoint.set(point);
    this.markerPosition.set(point);
    this.circleCenter.set(point);
    this.scheduleSearch();

    // Resolve the display-only area name asynchronously.
    void this.resolveAreaName(point);
  }

  // ═════════════════════════════════════════════════════════════
  //  Search
  // ═════════════════════════════════════════════════════════════

  private scheduleSearch(opts: { cityOnly?: boolean } = {}): void {
    if (this.searchHandle) clearTimeout(this.searchHandle);
    this.searchHandle = setTimeout(() => this.runSearch(opts), SEARCH_DEBOUNCE_MS);
  }

  private runSearch(opts: { cityOnly?: boolean } = {}): void {
    const city = this.draftCity();
    if (!city) {
      this.results.set([]);
      return;
    }

    const point = this.draftPoint();
    if (!opts.cityOnly && !point) {
      // Nothing to search for yet.
      this.results.set([]);
      return;
    }

    const request: LocationSearchRequest = {
      cityIds: [city.id],
      moderationStatus: 'APPROVED',
      size: 100,
      sortBy: 'name',
      sortDirection: 'ASC',
      ...(opts.cityOnly || !point
        ? {}
        : {
            nearLatitude: point.lat,
            nearLongitude: point.lng,
            radiusKm: this.draftRadiusKm(),
          }),
    };

    const token = ++this.searchToken;
    this.isSearching.set(true);

    this.locationService.searchLocations(request)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (page) => {
          // Ignore stale responses.
          if (token !== this.searchToken) return;
          this.results.set(page.content);
          this.isSearching.set(false);
        },
        error: (err) => {
          if (token !== this.searchToken) return;
          console.error('[LocationSelector] search failed', err);
          this.results.set([]);
          this.isSearching.set(false);
        },
      });
  }

  // ═════════════════════════════════════════════════════════════
  //  Area name (display only)
  // ═════════════════════════════════════════════════════════════

  /**
   * Resolves a short human label for the given point via Google's
   * reverse geocoder. The value is shown in the summary but is
   * NEVER sent to the backend.
   *
   * Priority:
   *   1. sublocality / sublocality_level_1 / neighborhood
   *   2. route (street name)
   *   3. nearest found location's `name` (in-application data)
   *   4. city name
   */
  private async resolveAreaName(point: google.maps.LatLngLiteral): Promise<void> {
    // Clear the previous label immediately so the UI doesn't show a
    // stale value while the new one is resolving.
    this.draftAreaName.set(null);

    const google = await this.geocode(point);

    if (google) {
      this.draftAreaName.set(google);
      return;
    }

    // Fallback to the nearest found location's name.
    const nearest = this.results()[0]?.name;
    if (nearest) {
      this.draftAreaName.set(nearest);
      return;
    }

    // Fallback to the city name.
    const city = this.draftCity();
    if (city) {
      this.draftAreaName.set(city.name);
    }
  }

  private geocode(point: google.maps.LatLngLiteral): Promise<string | null> {
    if (!this.geocoder) return Promise.resolve(null);

    return new Promise((resolve) => {
      this.zone.runOutsideAngular(() => {
        this.geocoder!.geocode({ location: point }, (results, status) => {
          if (status !== 'OK' || !results?.length) {
            resolve(null);
            return;
          }
          const label = this.pickAreaLabel(results[0]);
          this.zone.run(() => resolve(label));
        });
      });
    });
  }

  private pickAreaLabel(result: google.maps.GeocoderResult): string | null {
    const priority = [
      'sublocality_level_1',
      'sublocality',
      'neighborhood',
      'route',
    ];

    for (const type of priority) {
      const component = result.address_components?.find(
        (c) => c.types.includes(type),
      );
      if (component) return component.long_name;
    }

    // Last resort: truncate the formatted address at the first comma.
    const formatted = result.formatted_address;
    if (!formatted) return null;
    const firstComma = formatted.indexOf(',');
    return firstComma > 0 ? formatted.substring(0, firstComma) : formatted;
  }

  // ═════════════════════════════════════════════════════════════
  //  Template helpers
  // ═════════════════════════════════════════════════════════════

  protected canApply(): boolean {
    return !!this.draftCity();
  }

  protected summaryLocationCount(): number {
    return this.committed()?.locations.length ?? 0;
  }
}

export interface CommittedSelection {
  city: City;
  point: google.maps.LatLngLiteral | null;
  radiusKm: number;
  areaName?: string;
  locations: LocationSummary[];
}
