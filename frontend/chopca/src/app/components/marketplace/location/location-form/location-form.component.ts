import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  inject,
  signal,
  OnInit,
  AfterViewInit,
  ViewChild,
  ElementRef,
  NgZone,
} from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { GoogleMapsModule, GoogleMap } from '@angular/google-maps';
import { CityCoordinatesService } from '@app/core/services/marketplace/city-coordinates.service';
import { LOCATION_SERVICE } from '@app/core/services/marketplace/location.service';
import { CITY_SERVICE } from '@app/core/services/marketplace/city.service';
import { GoogleMapsLoaderService } from '@app/core/services/google-maps-loader.service';
import { Location, LocationRequest, City } from '@app/core/models/marketplace';

/**
 * Location create / edit form with Google Map picker.
 *
 * Behavior:
 * - Select a city → map centers there (or on Yaoundé if the city
 *   isn't in the static coordinate list)
 * - Search for a place → autocomplete fills lat/lng + address
 * - Click / drag on the map → lat/lng update + reverse geocode fills address
 * - Type lat/lng manually → marker moves
 *
 * Emits the persisted Location on success.
 */
@Component({
  selector: 'app-location-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    GoogleMapsModule,
  ],
  templateUrl: './location-form.component.html',
  styleUrl: './location-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LocationFormComponent implements OnInit, AfterViewInit {

  private readonly fb = inject(FormBuilder);
  private readonly locationService = inject(LOCATION_SERVICE);
  private readonly cityService = inject(CITY_SERVICE);
  private readonly mapsLoader = inject(GoogleMapsLoaderService);
  private readonly zone = inject(NgZone);
  private readonly cityCoordinates = inject(CityCoordinatesService);

  @ViewChild(GoogleMap) map?: GoogleMap;
  @ViewChild('searchInput') searchInput?: ElementRef<HTMLInputElement>;

  readonly location = input<Location | null>(null);
  readonly saved     = output<Location>();
  readonly cancelled = output<void>();

  readonly cities = signal<City[]>([]);
  readonly selectedCityId = signal<string | null>(null);

  readonly mapCenter = signal<google.maps.LatLngLiteral>({ lat: 3.8480, lng: 11.5021 });
  readonly mapZoom = signal<number>(12);
  readonly markerPosition = signal<google.maps.LatLngLiteral>({ lat: 3.8480, lng: 11.5021 });

  readonly mapOptions = signal<google.maps.MapOptions | null>(null);
  readonly markerOptions = signal<google.maps.MarkerOptions | null>(null);

  private geocoder?: google.maps.Geocoder;

  readonly submitting = signal<boolean>(false);
  readonly serverError = signal<string | null>(null);
  readonly isEditMode = signal<boolean>(false);

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    cityId: ['', [Validators.required]],
    address: ['', [Validators.required, Validators.maxLength(255)]],
    phone: ['', [Validators.maxLength(50)]],
    latitude: [3.8480, [Validators.required, Validators.min(-90), Validators.max(90)]],
    longitude: [11.5021, [Validators.required, Validators.min(-180), Validators.max(180)]],
    deliveryRadius: [10, [Validators.min(0)]],
  });

  protected get name() { return this.form.controls.name; }
  protected get cityId() { return this.form.controls.cityId; }
  protected get address() { return this.form.controls.address; }
  protected get phone() { return this.form.controls.phone; }
  protected get latitude() { return this.form.controls.latitude; }
  protected get longitude() { return this.form.controls.longitude; }
  protected get deliveryRadius() { return this.form.controls.deliveryRadius; }

  ngOnInit(): void {
    this.cityService.getCities().subscribe({
      next: (cities) => this.cities.set(cities),
      error: (err) => console.error('[LocationForm] cities error', err),
    });

    const existing = this.location();
    if (existing && existing.id) {
      this.isEditMode.set(true);
      this.form.patchValue({
        name: existing.name,
        address: existing.address,
        phone: existing.phone ?? '',
        latitude: existing.latitude,
        longitude: existing.longitude,
        deliveryRadius: existing.deliveryRadius ?? 10,
        cityId: existing.city?.id ?? '',
      });
      this.selectedCityId.set(existing.city?.id ?? null);
      this.updateMap({ lat: existing.latitude, lng: existing.longitude });
    } else if (existing) {
      this.form.patchValue({
        name: existing.name ?? '',
      });
    }
    this.form.controls.cityId.valueChanges.subscribe((value) => this.onCityChange(value));
    this.form.controls.latitude.valueChanges.subscribe(() => this.syncMarker());
    this.form.controls.longitude.valueChanges.subscribe(() => this.syncMarker());
  }

  async ngAfterViewInit(): Promise<void> {
    await this.mapsLoader.load();

    this.mapOptions.set({
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
      zoomControl: true,
    });

    this.markerOptions.set({
      draggable: true,
      animation: google.maps.Animation.DROP,
    });

    this.geocoder = new google.maps.Geocoder();
    this.attachAutocomplete();
  }

  onMapClick(event: google.maps.MapMouseEvent): void {
    if (!event.latLng) return;
    const lat = event.latLng.lat();
    const lng = event.latLng.lng();
    this.form.patchValue({ latitude: lat, longitude: lng });
    this.updateMap({ lat, lng });
    this.reverseGeocode(lat, lng);
  }

  onMarkerDragEnd(event: google.maps.MapMouseEvent): void {
    if (!event.latLng) return;
    const lat = event.latLng.lat();
    const lng = event.latLng.lng();
    this.form.patchValue({ latitude: lat, longitude: lng });
    this.markerPosition.set({ lat, lng });
    this.reverseGeocode(lat, lng);
  }

  onCityChange(cityId: string): void {
    if (!cityId) return;
    this.selectedCityId.set(cityId);

    const city = this.cities().find(c => c.id === cityId);
    const coords = this.cityCoordinates.getCoordinates(city?.name);

    this.form.patchValue(
      { latitude: coords.lat, longitude: coords.lng },
      { emitEvent: false },
    );
    this.form.patchValue({ latitude: coords.lat, longitude: coords.lng });
    this.updateMap(coords);
  }

  private syncMarker(): void {
    const lat = this.form.controls.latitude.value;
    const lng = this.form.controls.longitude.value;
    if (lat == null || lng == null) return;
    this.updateMap({ lat, lng });
  }

  private updateMap(pos: google.maps.LatLngLiteral): void {
    this.mapCenter.set(pos);
    this.markerPosition.set(pos);
    this.mapZoom.set(15);
    if (this.map?.googleMap) {
      this.zone.runOutsideAngular(() => this.map?.googleMap?.panTo(pos));
    }
  }

  private reverseGeocode(lat: number, lng: number): void {
    if (!this.geocoder) return;
    this.zone.runOutsideAngular(() => {
      this.geocoder!.geocode({ location: { lat, lng } }, (results, status) => {
        if (status === 'OK' && results?.[0]) {
          this.zone.run(() => {
            this.form.patchValue({ address: results[0].formatted_address });
          });
        }
      });
    });
  }

  private attachAutocomplete(): void {
    const el = this.searchInput?.nativeElement;
    if (!el) return;
    this.zone.runOutsideAngular(() => {
      const ac = new google.maps.places.Autocomplete(el, {
        fields: ['geometry', 'formatted_address'],
        componentRestrictions: { country: 'cm' },
      });
      ac.addListener('place_changed', () => {
        const place = ac.getPlace();
        if (!place.geometry?.location) return;
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        this.zone.run(() => {
          this.form.patchValue({
            latitude: lat, longitude: lng,
            address: place.formatted_address ?? '',
          });
          this.updateMap({ lat, lng });
        });
      });
    });
  }


  // ═══════════════════════════════════════════════════════════
  //  Field error accessors
  // ═══════════════════════════════════════════════════════════

  protected nameError(): string | null {
    const c = this.name;
    if (!c.touched || !c.errors) return null;
    if (c.errors['required'])  return 'Le nom est requis';
    if (c.errors['minlength']) return 'Minimum 2 caractères';
    if (c.errors['maxlength']) return 'Maximum 100 caractères';
    return null;
  }

  protected cityIdError(): string | null {
    const c = this.cityId;
    if (!c.touched || !c.errors) return null;
    if (c.errors['required']) return 'La ville est requise';
    return null;
  }

  protected addressError(): string | null {
    const c = this.address;
    if (!c.touched || !c.errors) return null;
    if (c.errors['required'])  return "L'adresse est requise";
    if (c.errors['maxlength']) return 'Maximum 255 caractères';
    return null;
  }

  protected phoneError(): string | null {
    const c = this.phone;
    if (!c.touched || !c.errors) return null;
    if (c.errors['maxlength']) return 'Maximum 50 caractères';
    return null;
  }

  protected latitudeError(): string | null {
    const c = this.latitude;
    if (!c.touched || !c.errors) return null;
    if (c.errors['required']) return 'Latitude requise';
    if (c.errors['min'] || c.errors['max']) return 'Entre -90 et 90';
    return null;
  }

  protected longitudeError(): string | null {
    const c = this.longitude;
    if (!c.touched || !c.errors) return null;
    if (c.errors['required']) return 'Longitude requise';
    if (c.errors['min'] || c.errors['max']) return 'Entre -180 et 180';
    return null;
  }

  protected deliveryRadiusError(): string | null {
    const c = this.deliveryRadius;
    if (!c.touched || !c.errors) return null;
    if (c.errors['min']) return 'Doit être positif';
    return null;
  }

  // ═══════════════════════════════════════════════════════════
  //  Submit
  // ═══════════════════════════════════════════════════════════

  onCancel(): void {
    if (this.submitting()) return;
    this.cancelled.emit();
  }

  onSubmit(): void {
    if (this.submitting()) return;
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    this.submitting.set(true);
    this.serverError.set(null);

    const v = this.form.getRawValue();
    const request: LocationRequest = {
      name: v.name.trim(),
      cityId: v.cityId,
      address: v.address.trim(),
      phone: v.phone?.trim() || undefined,
      latitude: v.latitude!,
      longitude: v.longitude!,
      deliveryRadius: v.deliveryRadius ?? undefined,
    };

    const existing = this.location();
    const op = existing?.id
      ? this.locationService.updateLocation(existing.id, request)
      : this.locationService.createLocation(request);

    op.subscribe({
      next: (location) => {
        this.submitting.set(false);
        this.saved.emit(location);
      },
      error: (err) => {
        this.submitting.set(false);
        this.serverError.set(
          err?.error?.message ?? 'Une erreur est survenue. Veuillez réessayer.'
        );
      },
    });
  }
}
