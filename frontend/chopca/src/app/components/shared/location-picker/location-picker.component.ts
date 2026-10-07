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
  HostListener,
  effect,
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
 * Emits:
 *  - cityChange       — when the user picks a city
 *  - pointChange      — when the user places or moves the picker marker
 *  - locationsChange  — when the search settles with a new result set
 *
 * Detail card: clicking a Chop ça pin opens a card anchored to the
 * click's browser pixel coordinates. The card does not track the pin
 * on pan/zoom — it closes on any click outside itself.
 *
 * The Google Maps JS API is injected once by the app initializer.
 * This component never injects anything — it only reads
 * `GoogleMapsLoaderService.state`.
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
  readonly initialLocations = input<LocationSummary[]>([]);

  // ─── Outputs ─────────────────────────────────────────────────
  readonly cityChange = output<City | null>();
  readonly pointChange = output<PickerPoint | null>();
  readonly locationsChange = output<LocationSummary[]>();

  // ─── Maps loader state ───────────────────────────────────────
  protected readonly mapsState = this.mapsLoader.state;

  /**
   * Latches to `true` the first time the loader reports `loaded`.
   * Gates the `<google-map>` element so it is created once, never
   * destroyed, and never constructed before the API exists.
   */
  private readonly _apiLatched = signal<boolean>(false);
  protected readonly apiLatched = this._apiLatched.asReadonly();

  // ─── Public UI state ─────────────────────────────────────────
  protected readonly radiusMin = RADIUS_MIN;
  protected readonly radiusMax = RADIUS_MAX;

  protected readonly cities = signal<City[]>([]);
  protected readonly draftCity = signal<City | null>(null);
  protected readonly draftPoint = signal<google.maps.LatLngLiteral | null>(null);
  protected readonly draftRadiusKm = signal<number>(RADIUS_DEFAULT);

  protected readonly results = signal<LocationSummary[]>([]);
  protected readonly isSearching = signal<boolean>(false);

  /** The location currently shown in the detail card. */
  protected readonly selectedLocation = signal<LocationSummary | null>(null);

  /**
   * The browser-pixel position of the detail card, taken from the
   * click's `clientX`/`clientY`. The card uses `position: fixed`, so
   * these coordinates map directly to its `left`/`top` styles.
   */
  protected readonly cardPosition = signal<{ x: number; y: number } | null>(null);

  protected readonly mapCenter = signal<google.maps.LatLngLiteral>({
    lat: 3.8480, lng: 11.5021,
  });
  protected readonly mapZoom = signal<number>(12);
  protected readonly markerPosition = signal<google.maps.LatLngLiteral | null>(null);
  protected readonly circleCenter = signal<google.maps.LatLngLiteral | null>(null);
  protected readonly circleRadiusMeters = signal<number>(RADIUS_DEFAULT * 1000);

  // ─── Maps options — plain objects, safe at field-init time ───
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

  /**
   * Chop ça pin icon. Plain object with structural Size/Point shapes
   * so nothing touches `google.maps.*` at field-init time.
   */
  protected readonly resultPinIcon = {
    url: '/assets/icons/chopca-pin.svg',
    scaledSize: { width: 28, height: 60 } as google.maps.Size,
    anchor: { x: 14, y: 60 } as google.maps.Point,
  };

  // ─── Internals ───────────────────────────────────────────────
  private searchHandle: ReturnType<typeof setTimeout> | null = null;
  private searchToken = 0;
  private seeded = false;

  // ═════════════════════════════════════════════════════════════
  //  Lifecycle
  // ═════════════════════════════════════════════════════════════

  constructor() {
    // Latch the API-ready flag the first time the loader succeeds.
    effect(() => {
      if (this.mapsState() === 'loaded' && !this._apiLatched()) {
        this._apiLatched.set(true);
      }
    });

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
          this.seedInitialState(cities);
        },
        error: (err) => console.error('[LocationPicker] cities error', err),
      });
  }

  ngAfterViewInit(): void {
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

    if (this.seeded && this.mapsState() === 'loaded'
        && this.draftCity() && this.results().length === 0) {
      this.scheduleSearch({ cityOnly: !this.draftPoint() });
    }
  }

  // ═════════════════════════════════════════════════════════════
  //  Initial state seeding
  // ═════════════════════════════════════════════════════════════

  private seedInitialState(cities: City[]): void {
    if (this.seeded) return;
    this.seeded = true;

    const initial = this.initialCity();
    if (!initial) return;

    const match = cities.find((c) => c.id === initial.id);
    if (!match) return;

    this.draftCity.set(match);

    const p = this.draftPoint();
    const target = p
      ? { center: p, zoom: 15 }
      : { center: this.cityCoordinates.getCoordinates(match.name), zoom: 12 };

    this.mapCenter.set(target.center);
    this.mapZoom.set(target.zoom);

    queueMicrotask(() => {
      const gmap = this.map?.googleMap;
      if (gmap) {
        this.zone.runOutsideAngular(() => {
          gmap.panTo(target.center);
          gmap.setZoom(target.zoom);
        });
      }
    });

    if (this.mapsState() === 'loaded' && this.initialLocations().length === 0) {
      this.scheduleSearch({ cityOnly: !this.draftPoint() });
    }
  }

  // ═════════════════════════════════════════════════════════════
  //  City selection
  // ═════════════════════════════════════════════════════════════

  protected onCityChangeById(id: string): void {
    // City changes close the detail card.
    this.clearSelectedLocation();

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
    this.clearSelectedLocation();
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
  //  Detail card
  // ═════════════════════════════════════════════════════════════

  /**
   * Opens the detail card at the click's browser pixel coordinates.
   *
   * The map event carries the original DOM event in `.domEvent`, so
   * `clientX`/`clientY` are the actual screen coordinates of the
   * click. Since the card uses `position: fixed`, those coordinates
   * map directly to its `left`/`top`.
   *
   * The card does not track the pin on pan/zoom — it closes on any
   * click outside itself (see `onDocumentClick`).
   */
  protected onPinClick(loc: LocationSummary, event: google.maps.MapMouseEvent): void {
    const domEvent = event.domEvent as MouseEvent | undefined;
    if (!domEvent) return;

    this.selectedLocation.set(loc);
    this.cardPosition.set({
      x: domEvent.clientX,
      y: domEvent.clientY,
    });
  }

  protected clearSelectedLocation(): void {
    this.selectedLocation.set(null);
    this.cardPosition.set(null);
  }

  /**
   * Any document click that isn't inside the card, the map, or
   * Google's own map chrome closes the card.
   *
   * The three exclusions handle:
   *  - `.picker-detail-card` → the card itself (its × closes it,
   *    and it calls stopPropagation on other clicks).
   *  - `google-map` → the `<google-map>` element, which contains
   *    the canvas, markers, and controls. Clicks there have their
   *    own handlers (`onMapClick`, `onPinClick`).
   *  - `.gm-style` → Google's injected root class, covering marker
   *    and control DOM that may be rendered outside `<google-map>`.
   */
  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    if (!this.selectedLocation()) return;

    const target = event.target as HTMLElement;
    if (!target) return;

    if (target.closest('.picker-detail-card')) return;
    if (target.closest('google-map')) return;
    if (target.closest('.gm-style')) return;

    this.clearSelectedLocation();
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
