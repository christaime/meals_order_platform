import {
  Component,
  ChangeDetectionStrategy,
  input,
  computed,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { startWith, switchMap } from 'rxjs/operators';
import { toObservable } from '@angular/core/rxjs-interop';

import { BadgeComponent } from '@components/shared/badge/badge.component';
import { FormFieldComponent } from '@components/shared/form-field/form-field.component';
import { FormErrorComponent } from '@components/shared/form-error/form-error.component';
import { INPUT_CLASSES } from '@components/shared/form-field/input-classes';
import { CategoryPillsSelectorComponent } from '@components/shared/category-pills-selector/category-pills-selector.component';


@Component({
  selector: 'app-meal-identity-card',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    BadgeComponent,
    FormFieldComponent,
    FormErrorComponent,
    CategoryPillsSelectorComponent,
  ],
  templateUrl: './meal-identity-card.component.html',
  styleUrl: './meal-identity-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MealIdentityCardComponent {

  // ─── Inputs ───────────────────────────────────────────────
  /** The parent's form group. */
  readonly form = input.required<FormGroup>();

  /** Max characters for the description. */
  readonly maxDescriptionLength = input<number>(300);

  // ─── Exposed for the template ─────────────────────────────
  protected readonly INPUT_CLASSES = INPUT_CLASSES;

  // ─── Convenience accessors ────────────────────────────────
  protected get name(): FormControl<string> {
    return this.form().controls['name'] as FormControl<string>;
  }
  protected get cuisineIds(): FormControl<string[]> {
    return this.form().controls['cuisineIds'] as FormControl<string[]>;
  }
  protected get dishTypeIds(): FormControl<string[]> {
    return this.form().controls['dishTypeIds'] as FormControl<string[]>;
  }
  protected get description(): FormControl<string> {
    return this.form().controls['description'] as FormControl<string>;
  }

  // ─── Reactive Signals for Form Values ─────────────────────
  // Listens to form changes reactively without throwing initialization errors
  private readonly descriptionValue = toSignal(
    toObservable(this.form).pipe(
      switchMap((formGroup) => {
        const ctrl = formGroup.controls['description'];
        return ctrl.valueChanges.pipe(startWith(ctrl.value));
      })
    ),
    { initialValue: '' }
  );

  // ─── Derived ──────────────────────────────────────────────
  protected readonly descriptionLength = computed(
    () => this.descriptionValue()?.length ?? 0
  );

  protected readonly descriptionCounter = computed(
    () => `${this.descriptionLength()}/${this.maxDescriptionLength()} car.`
  );

  // ─── Error helpers ────────────────────────────────────────

  protected get nameError(): string | null {
    const ctrl = this.name;
    if (!ctrl?.touched || !ctrl?.errors) return null;
    if (ctrl.errors['required']) return 'Le nom du plat est requis';
    if (ctrl.errors['minlength']) return 'Minimum 3 caractères';
    if (ctrl.errors['maxlength']) return 'Maximum 100 caractères';
    return null;
  }

  protected get cuisineIdsError(): string | null {
    const ctrl = this.cuisineIds;
    if (!ctrl || !ctrl.touched) return null;
    const value = ctrl.value;
    if (!value || value.length === 0) {
      return 'Sélectionnez au moins une cuisine';
    }
    return null;
  }

  protected get dishTypeIdsError(): string | null {
    const ctrl = this.dishTypeIds;
    if (!ctrl || !ctrl.touched) return null;
    const value = ctrl.value;
    if (!value || value.length === 0) {
      return 'Sélectionnez au moins un type de plat';
    }
    return null;
  }

  protected get descriptionError(): string | null {
    const ctrl = this.description;
    if (!ctrl?.touched || !ctrl?.errors) return null;
    if (ctrl.errors['maxlength']) {
      return `Maximum ${this.maxDescriptionLength()} caractères`;
    }
    return null;
  }
}
