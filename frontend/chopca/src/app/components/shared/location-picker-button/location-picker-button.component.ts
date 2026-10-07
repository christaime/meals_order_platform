import {
  Component,
  ChangeDetectionStrategy,
  signal,
  output,
  inject,
  HostListener,
  DestroyRef,
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

/**
 * The button + dropdown panel that wraps LocationPickerComponent.
 *
 * Owns:
 *  - the closed-state summary (city, count, radius)
 *  - the open/close state
 *  - the × clear affordance
 *  - the panel positioning
 *  - the outside-click listener
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

  protected openPanel(): void {
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

  // ═════════════════════════════════════════════════════════════
  //  Outside click
  // ═════════════════════════════════════════════════════════════

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    if (!this.isOpen()) return;

    const target = event.target as HTMLElement;
    if (!target) return;

    if (target.closest('.location-picker-container')) return;

    this.closePanel();
  }

  // ═════════════════════════════════════════════════════════════
  //  Template helpers
  // ═════════════════════════════════════════════════════════════

  protected canApply(): boolean {
    return !!this.draftCity();
  }
}
