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
  OnInit,
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

const RADIUS_MIN = 1;
const RADIUS_MAX = 30;
const RADIUS_DEFAULT = 10;
const SEARCH_DEBOUNCE_MS = 400;

/** Google Maps Animation.DROP value, kept as a literal so no
 *  `google.maps.*` is touched at field-initialization time. */
const ANIMATION_DROP = 2 as google.maps.Animation;

export interface PickerPoint {
  latitude: number;
  longitude: number;
  radiusKm: number;
}

/**
 * The map + city + radius picker.
 *
 * Owns:
 *  - the city dropdown
 *  - the Google map with the draggable picker marker
 *  - the radius slider
 *  - the location search that powers the live count
 *
 * The Google Maps JS API is injected once by the app initializer
 * (or, as a fallback, by `mapsPreloadGuard`). This component never
 * injects anything — it only reads `GoogleMapsLoaderService.state`.
 *
 * The <google-map> element is always in the DOM. When the API hasn't
 * loaded, the map slot is rendered at full size with `opacity-0` and
 * an overlay covers it. This keeps `@ViewChild(GoogleMap)` stable
 * and lets Google Maps measure a real container.
 *
 * ## City seeding
 *
 * The initial city is seeded **once** in `ngOnInit`, when the city
 * list resolves. This is deliberately *not* done in an `effect()`,
 * because an effect that both reads `draftCity` and writes to it
 * would re-run whenever the user changed the selection and would
 * overwrite their choice with the initial value. That was the exact
 * bug behind "the select shows Yaoundé but the payload sends Douala".
 */
@Component({
  selector: 'app-location-picker',
  standalone: true,
  imports: [CommonModule, IconComponent, GoogleMapsModule],
  templateUrl: './location-picker.component.html',
  styleUrl: './location-picker.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LocationPickerComponent implements OnInit, AfterViewInit {

  private readonly locationService = inject(LOCATION_SERVICE);
  private readonly cityService = inject(CITY_SERVICE);
  private readonly cityCoordinates = inject(CityCoordinatesService);
  private readonly mapsLoader = inject(GoogleMapsLoaderService);
  private readonly zone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild(GoogleMap) map?: GoogleMap;

  // ─── Inputs ──────────────────────────────────────────────────
  readonly initialCity = input<City | null>(null);
  readonly initialPoint = input<{ latitude: number; longitude: number } | null>(null);
  readonly initialRadiusKm = input<number>(RADIUS_DEFAULT);

  /** Locations from a previous selection — shown on the count. */
  readonly initialLocations = input<LocationSummary[]>([]);

  // ─── Outputs ─────────────────────────────────────────────────
  readonly cityChange = output<City | null>();
  readonly pointChange = output<PickerPoint | null>();
  readonly locationsChange = output<LocationSummary[]>();

  // ─── Maps loader state — read-only, exposed to the template ──
  protected readonly mapsState = this.mapsLoader.state;

  // ─── Public UI state ─────────────────────────────────────────
  protected readonly radiusMin = RADIUS_MIN;
  protected readonly radiusMax = RADIUS_MAX;

  protected readonly cities = signal<City[]>([]);
  protected readonly draftCity = signal<City | null>(null);
  protected readonly draftPoint = signal<google.maps.LatLngLiteral | null>(null);
  protected readonly draftRadiusKm = signal<number>(RADIUS_DEFAULT);

  protected readonly results = signal<LocationSummary[]>([]);
  protected readonly isSearching = signal<boolean>(false);

  protected readonly mapCenter = signal<google.maps.LatLngLiteral>({
    lat: 3.8480, lng: 11.5021,
  });
  protected readonly mapZoom = signal<number>(12);
  protected readonly markerPosition = signal<google.maps.LatLngLiteral | null>(null);
  protected readonly circleCenter = signal<google.maps.LatLngLiteral | null>(null);
  protected readonly circleRadiusMeters = signal<number>(RADIUS_DEFAULT * 1000);

  // ─── Maps options — plain objects, safe to declare at field init ───
  protected readonly mapOptions: google.maps.MapOptions = {
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: false,
    zoomControl: true,
  };

  protected readonly pickerMarkerOptions: google.maps.MarkerOptions = {
    draggable: true,
    animation: ANIMATION_DROP,
  };

  protected readonly circleOptions: google.maps.CircleOptions = {
    fillColor: '#7C3AED',
    fillOpacity: 0.12,
    strokeColor: '#7C3AED',
    strokeOpacity: 0.6,
    strokeWeight: 2,
  };

  // ─── Internals ───────────────────────────────────────────────
  private searchHandle: ReturnType<typeof setTimeout> | null = null;
  private searchToken = 0;
  private seeded = false;

  // ═════════════════════════════════════════════════════════════
  //  Lifecycle
  // ═════════════════════════════════════════════════════════════

  constructor() {
    this.destroyRef.onDestroy(() => {
      if (this.searchHandle) clearTimeout(this.searchHandle);
    });
  }

  ngOnInit(): void {
    this.cityService.getCities()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (cities: City[]) => {
          this.cities.set(cities);
          this.seedInitialCity(cities);
        },
        error: (err) => console.error('[LocationPicker] cities error', err),
      });
  }

  ngAfterViewInit(): void {
    // Restore the initial point and radius. The map options are plain
    // objects set at field init, so nothing to build here.
    const p = this.initialPoint();
    if (p) {
      const literal = { lat: p.latitude, lng: p.longitude };
      this.draftPoint.set(literal);
      this.markerPosition.set(literal);
      this.circleCenter.set(literal);
      this.mapCenter.set(literal);
      this.mapZoom.set(15);
    }

    const r = this.initialRadiusKm();
    this.draftRadiusKm.set(r);
    this.circleRadiusMeters.set(r * 1000);

    const seededLocations = this.initialLocations();
    if (seededLocations.length > 0) {
      this.results.set(seededLocations);
    }

    // If the city was seeded synchronously (fast network), run the
    // initial search now. If seeding hasn't happened yet, the
    // `seedInitialCity` callback will trigger it when cities arrive.
    if (this.seeded && this.mapsState() === 'loaded'
        && this.draftCity() && this.results().length === 0) {
      this.scheduleSearch({ cityOnly: !this.draftPoint() });
    }
  }

  // ═════════════════════════════════════════════════════════════
  //  City seeding — runs at most once per picker instance
  // ═════════════════════════════════════════════════════════════

  /**
   * Applies the initial city (if provided) exactly once, and pans the
   * map / triggers the initial search.
   *
   * The `seeded` flag makes this idempotent. Nothing else in the
   * component writes to `draftCity` except `onCityChangeById` (user
   * input), so once seeded, the user's choice is the single source of
   * truth for the rest of the picker's lifetime.
   */
  private seedInitialCity(cities: City[]): void {
    if (this.seeded) return;

    const initial = this.initialCity();
    if (!initial) {
      // No initial city — nothing to seed. But mark as seeded so a
      // future re-entry (defensive) doesn't try to run again.
      this.seeded = true;
      return;
    }

    const match = cities.find((c) => c.id === initial.id);
    if (!match) {
      this.seeded = true;
      return;
    }

    this.seeded = true;
    this.draftCity.set(match);

    const p = this.draftPoint();
    const target = p
      ? { center: p, zoom: 15 }
      : { center: this.cityCoordinates.getCoordinates(match.name), zoom: 12 };

    this.mapCenter.set(target.center);
    this.mapZoom.set(target.zoom);

    // Pan once the map is rendered. On first open it might not exist
    // yet — the microtask deferral covers that.
    queueMicrotask(() => {
      const gmap = this.map?.googleMap;
      if (gmap) {
        this.zone.runOutsideAngular(() => {
          gmap.panTo(target.center);
          gmap.setZoom(target.zoom);
        });
      }
    });

    // Trigger the initial search once the map is available.
    if (this.mapsState() === 'loaded' && this.initialLocations().length === 0) {
      this.scheduleSearch({ cityOnly: !this.draftPoint() });
    }
  }

  // ═════════════════════════════════════════════════════════════
  //  City selection
  // ═════════════════════════════════════════════════════════════

  protected onCityChangeById(id: string): void {
    const city = this.cities().find((c) => c.id === id) ?? null;
    this.draftCity.set(city);
    this.cityChange.emit(city);

    this.draftPoint.set(null);
    this.markerPosition.set(null);
    this.circleCenter.set(null);
    this.pointChange.emit(null);

    if (!city) {
      this.results.set([]);
      this.locationsChange.emit([]);
      return;
    }

    const center = this.cityCoordinates.getCoordinates(city.name);
    this.mapCenter.set(center);
    this.mapZoom.set(12);

    const gmap = this.map?.googleMap;
    if (gmap) {
      this.zone.runOutsideAngular(() => {
        gmap.panTo(center);
        gmap.setZoom(12);
      });
    }

    this.scheduleSearch({ cityOnly: true });
  }

  // ═════════════════════════════════════════════════════════════
  //  Map interaction
  // ═════════════════════════════════════════════════════════════

  protected onMapClick(event: google.maps.MapMouseEvent): void {
    if (!event.latLng) return;
    this.applyPoint({ lat: event.latLng.lat(), lng: event.latLng.lng() });
  }

  protected onMarkerDragEnd(event: google.maps.MapMouseEvent): void {
    if (!event.latLng) return;
    this.applyPoint({ lat: event.latLng.lat(), lng: event.latLng.lng() });
  }

  protected onRadiusChange(event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    this.draftRadiusKm.set(value);
    this.circleRadiusMeters.set(value * 1000);
    this.emitPoint();
    this.scheduleSearch();
  }

  private applyPoint(point: google.maps.LatLngLiteral): void {
    this.draftPoint.set(point);
    this.markerPosition.set(point);
    this.circleCenter.set(point);
    this.emitPoint();
    this.scheduleSearch();
  }

  private emitPoint(): void {
    const p = this.draftPoint();
    if (!p) {
      this.pointChange.emit(null);
      return;
    }
    this.pointChange.emit({
      latitude: p.lat,
      longitude: p.lng,
      radiusKm: this.draftRadiusKm(),
    });
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
      this.locationsChange.emit([]);
      return;
    }

    const point = this.draftPoint();
    if (!opts.cityOnly && !point) {
      this.results.set([]);
      this.locationsChange.emit([]);
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
          if (token !== this.searchToken) return;
          this.results.set(page.content);
          this.locationsChange.emit(page.content);
          this.isSearching.set(false);
        },
        error: (err) => {
          if (token !== this.searchToken) return;
          console.error('[LocationPicker] search failed', err);
          this.results.set([]);
          this.locationsChange.emit([]);
          this.isSearching.set(false);
        },
      });
  }
}
