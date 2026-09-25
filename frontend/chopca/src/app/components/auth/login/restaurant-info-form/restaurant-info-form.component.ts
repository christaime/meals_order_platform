import {
  Component,
  ChangeDetectionStrategy,
  input,
  signal,
  computed,
  inject,
  OnInit,
} from '@angular/core';
import { FormGroup, ReactiveFormsModule, FormControl } from '@angular/forms';
import { IconComponent } from '@components/shared/icon/icon.component';
import { FormFieldComponent } from '@components/shared/form-field/form-field.component';
import { INPUT_CLASSES } from '@components/shared/form-field/input-classes';
import { FormErrorComponent } from '@components/shared/form-error/form-error.component';
import { CategoryPillsSelectorComponent } from '@components/shared/category-pills-selector/category-pills-selector.component';
import { CITY_SERVICE } from '@app/core/services/marketplace/city.service';
import { City } from '@app/core/models/marketplace';

/**
 * Step 1 of the vendor registration wizard: Restaurant identity.
 *
 * Receives the parent form (a FormGroup) and renders the identity fields.
 * The parent owns the form and validation; this component is a view layer
 * that maps form controls to inputs and handles the city dropdown.
 *
 * Fields:
 * - businessName   (text, required)
 * - ownerName      (text, required)
 * - description    (textarea, optional)
 * - cuisineIds     (multi-select via CategoryPillsSelector, required, max 3)
 * - cityId         (select, required, populated from CityService)
 * - district       (text, required)
 * - addressDetail  (textarea, required)
 *
 * Usage:
 *   <app-restaurant-info-form [form]="form" />
 */
@Component({
  selector: 'app-restaurant-info-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    IconComponent,
    FormFieldComponent,
    FormErrorComponent,
    CategoryPillsSelectorComponent,
  ],
  templateUrl: './restaurant-info-form.component.html',
  styleUrl: './restaurant-info-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RestaurantInfoFormComponent implements OnInit {

  private readonly cityService = inject(CITY_SERVICE);

  // ─── Inputs ───────────────────────────────────────────────
  /** The parent's registration form group. */
  readonly form = input.required<FormGroup>();

  // ─── Exposed for the template ─────────────────────────────
  protected readonly INPUT_CLASSES = INPUT_CLASSES;

  // ─── Internal state ───────────────────────────────────────
  protected readonly cities = signal<City[]>([]);
  protected readonly loadingCities = signal<boolean>(true);
  protected readonly citiesError = signal<string | null>(null);

  // ─── Lifecycle ────────────────────────────────────────────

  ngOnInit(): void {
    this.cityService.getCities().subscribe({
      next: (cities) => {
        this.cities.set(cities);
        this.loadingCities.set(false);
      },
      error: (err) => {
        this.citiesError.set('Impossible de charger la liste des villes.');
        this.loadingCities.set(false);
        console.error('[RestaurantInfoForm] cities fetch error', err);
      },
    });
  }

  // ─── Convenience accessors for the template ───────────────
  // These keep the template readable while remaining type-safe.

  protected get businessName(): FormControl { return this.form().controls['businessName'] as FormControl; }
  protected get ownerName(): FormControl   { return this.form().controls['ownerName'] as FormControl; }
  protected get description(): FormControl  { return this.form().controls['description'] as FormControl; }
  protected get cuisineIds(): FormControl   { return this.form().controls['cuisineIds'] as FormControl; }
  protected get cityId(): FormControl      { return this.form().controls['cityId'] as FormControl; }
  protected get district(): FormControl     { return this.form().controls['district'] as FormControl; }
  protected get addressDetail(): FormControl { return this.form().controls['addressDetail'] as FormControl; }

  // ─── Error helpers ────────────────────────────────────────

  protected errorFor(controlName: string, messages: Record<string, string>): string | null {
    const ctrl = this.form().controls[controlName];
    if (!ctrl || !ctrl.touched || !ctrl.errors) return null;
    for (const [key, message] of Object.entries(messages)) {
      if (ctrl.errors[key]) return message;
    }
    return null;
  }

  protected get businessNameError(): string | null {
    return this.errorFor('businessName', {
      required: 'Le nom du restaurant est requis',
      minlength: 'Le nom doit contenir au moins 3 caractères',
    });
  }

  protected get ownerNameError(): string | null {
    return this.errorFor('ownerName', {
      required: 'Le nom du responsable est requis',
    });
  }

  protected get cuisineIdsError(): string | null {
    const ctrl = this.cuisineIds;
    if (!ctrl || !ctrl.touched) return null;
    const value = ctrl.value as string[];
    if (!value || value.length === 0) {
      return 'Sélectionnez au moins une spécialité culinaire';
    }
    return null;
  }

  protected get cityIdError(): string | null {
    return this.errorFor('cityId', {
      required: 'Sélectionnez une ville',
    });
  }

  protected get districtError(): string | null {
    return this.errorFor('district', {
      required: 'Le quartier est requis',
    });
  }

  protected get addressDetailError(): string | null {
    return this.errorFor('addressDetail', {
      required: 'L\'adresse précise est requise',
    });
  }
}
