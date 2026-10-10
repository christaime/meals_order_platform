import {
  Component,
  ChangeDetectionStrategy,
  signal,
  input,
  output,
  inject,
  HostListener,
  DestroyRef,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { IconComponent } from '@components/shared/icon/icon.component';
import { CITY_SERVICE } from '@app/core/services/marketplace/city.service';
import {
  City,
  LocationSummary,
} from '@app/core/models/marketplace';
import { LocationPickerComponent, PickerPoint } from '../location-picker/location-picker.component';
import { PickerSize } from './picker-size';

/**
 * The button + dropdown panel that wraps LocationPickerComponent.
 *
 * Owns:
 *  - the closed-state summary (city, count, radius)
 *  - the open/close state (the trigger toggles)
 *  - the × clear affordance
 *  - the panel positioning (anchored to the button)
 *  - the outside-click listener
 *  - the panel's display size (via the `size` input)
 */
@Component({
  selector: 'app-location-picker-button',
  standalone: true,
  imports: [CommonModule, IconComponent, LocationPickerComponent],
  templateUrl: './location-picker-button.component.html',
  styleUrl: './location-picker-button.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LocationPickerButtonComponent {

  private readonly cityService = inject(CITY_SERVICE);
  private readonly destroyRef = inject(DestroyRef);

  // ─── Inputs ──────────────────────────────────────────────────
  /**
   * Display intent for the picker panel.
   *
   * The component maps this to per-breakpoint dimensions. Callers
   * never set width or height directly.
   *
   * Defaults to `comfortable` so existing call sites are unaffected.
   */
  readonly size = input<PickerSize>('comfortable');

  // ─── Outputs ─────────────────────────────────────────────────
  readonly locationsChange = output<LocationSummary[]>();
  readonly criteriaChange = output<{
    cityId: string;
    cityName: string;
    areaName?: string;
    latitude?: number;
    longitude?: number;
    radiusKm?: number;
  }>();

  // ─── State ───────────────────────────────────────────────────
  protected readonly isOpen = signal<boolean>(false);
  protected readonly cities = signal<City[]>([]);

  /** Committed state — what the closed button shows. */
  protected readonly committedCity = signal<City | null>(null);
  protected readonly committedPoint = signal<PickerPoint | null>(null);
  protected readonly committedLocations = signal<LocationSummary[]>([]);
  protected readonly committedAreaName = signal<string | null>(null);

  /** Draft state — what the picker is editing while the panel is open. */
  protected readonly draftCity = signal<City | null>(null);
  protected readonly draftPoint = signal<PickerPoint | null>(null);
  protected readonly draftLocations = signal<LocationSummary[]>([]);
  protected readonly isSearchingLocations = signal<boolean>(false);
  protected readonly foundLocationsCount = signal<number>(0);
  // ═════════════════════════════════════════════════════════════
  //  Size mapping — the only place breakpoints live
  // ═════════════════════════════════════════════════════════════

  /**
   * Tailwind width classes for the panel surface, per intent and
   * breakpoint.
   *
   * Breakpoints (Tailwind defaults):
   *  - base : phone   (< 768px)
   *  - sm   : small   (>= 640px)
   *  - md   : tablet  (>= 768px)
   *  - lg   : desktop (>= 1024px)
   */
  protected readonly surfaceClasses = computed<string>(() => {
    switch (this.size()) {
      case 'compact':
        return [
          'w-full',
          'sm:w-[24rem]',
          'md:w-[24rem]',
          'lg:w-[24rem]',
          `size-${this.size()}`
        ].join(' ');

      case 'comfortable':
        return [
          'w-full',
          'sm:w-[28rem]',
          'md:w-[32rem]',
          'lg:w-[32rem]',
          `size-${this.size()}`
        ].join(' ');

      case 'immersive':
        return [
          'w-full',
          'sm:w-[min(44rem,90vw)]',
          'md:w-[min(56rem,90vw)]',
          'lg:w-[min(72rem,90vw)]',
          `size-${this.size()}`
        ].join(' ');
    }
  });

  /**
   * Height classes for the panel, per intent.
   *
   *  - `compact` / `comfortable` — content-sized, capped against the
   *    viewport (`dvh` accounts for mobile browser chrome). The map
   *    stays at its 260px floor; no stretching.
   *  - `immersive` — a definite height, so the picker's map slot
   *    (`flex-1`) absorbs the leftover space and no empty area is
   *    left below it.
   *
   * The `calc(100dvh - 2rem)` cap keeps the panel inside the
   * viewport regardless of where the button sits on the page.
   */
  protected readonly panelHeightClasses = computed<string>(() => {
    switch (this.size()) {
      case 'compact':
        return 'max-h-[min(50vh,calc(100dvh-2rem))]';

      case 'comfortable':
        return 'max-h-[min(70vh,calc(100dvh-2rem))]';
      case 'immersive':
        return 'h-[min(85dvh,calc(100dvh-2rem))]';
      default:
        return '';
    }
  });

  constructor() {
    this.cityService.getCities()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (cities) => this.cities.set(cities),
        error: (err) => console.error('[LocationPickerButton] cities error', err),
      });
  }

  // ═════════════════════════════════════════════════════════════
  //  Panel lifecycle
  // ═════════════════════════════════════════════════════════════

  /**
   * Toggles the panel. First click opens (seeding the drafts from the
   * committed state); a second click closes it.
   *
   * The trigger button is inside `.location-picker-container`, so the
   * document-level outside-click listener ignores clicks on it — the
   * toggle is the only thing that runs on a trigger click.
   */
  protected togglePanel(): void {
    if (this.isOpen()) {
      this.closePanel();
      return;
    }

    this.draftCity.set(this.committedCity());
    this.draftPoint.set(this.committedPoint());
    this.draftLocations.set(this.committedLocations());
    this.isOpen.set(true);
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
    const locations = this.draftLocations();

    this.committedCity.set(city);
    this.committedPoint.set(point);
    this.committedLocations.set(locations);

    const areaName = this.committedAreaName() ?? undefined;

    this.locationsChange.emit(locations);
    this.criteriaChange.emit({
      cityId: city.id,
      cityName: city.name,
      areaName,
      latitude: point?.latitude,
      longitude: point?.longitude,
      radiusKm: point?.radiusKm,
    });

    this.closePanel();
  }

  protected clear(event: MouseEvent): void {
    event.stopPropagation();

    this.committedCity.set(null);
    this.committedPoint.set(null);
    this.committedLocations.set([]);
    this.committedAreaName.set(null);

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
  //  Picker events
  // ═════════════════════════════════════════════════════════════

  protected onPickerCityChange(city: City | null): void {
    this.draftCity.set(city);
  }

  protected onPickerPointChange(point: PickerPoint | null): void {
    this.draftPoint.set(point);
  }

  protected onPickerLocationsChange(locations: LocationSummary[]): void {
    this.draftLocations.set(locations);
  }

  protected onPickerSearchStateChange(state: { searching: boolean; count: number }): void {
    this.isSearchingLocations.set(state.searching);
    this.foundLocationsCount.set(state.count);
  }

  // ═════════════════════════════════════════════════════════════
  //  Outside click
  // ═════════════════════════════════════════════════════════════

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    if (!this.isOpen()) return;

    const target = event.target as HTMLElement;
    if (!target) return;

    if (target.closest('.location-picker-container')) return;

    //this.closePanel();
  }

  // ═════════════════════════════════════════════════════════════
  //  Template helpers
  // ═════════════════════════════════════════════════════════════

  protected canApply(): boolean {
    return !!this.draftCity();
  }
}
