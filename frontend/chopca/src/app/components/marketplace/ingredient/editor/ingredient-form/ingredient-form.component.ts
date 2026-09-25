import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  inject,
  signal,
  OnInit,
} from '@angular/core';
import {
  FormBuilder,
  FormControl,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { INGREDIENT_SERVICE } from '@app/core/services/marketplace/ingredient.service';
import { Ingredient, IngredientRequest } from '@app/core/models/marketplace';

/**
 * Ingredient create / edit form.
 *
 * Name-only. Optional allergen flag.
 * Emits the persisted Ingredient on success.
 *
 * Used inside NewIngredientDialogComponent. Can also be embedded inline.
 */
@Component({
  selector: 'app-ingredient-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './ingredient-form.component.html',
  styleUrl: './ingredient-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IngredientFormComponent implements OnInit {

  private readonly fb = inject(FormBuilder);
  private readonly ingredientService = inject(INGREDIENT_SERVICE);

  /** If provided → edit mode. Otherwise → create mode. */
  readonly ingredient = input<Ingredient | Partial<Ingredient> | null>(null);

  readonly saved     = output<Ingredient>();
  readonly cancelled = output<void>();

  readonly submitting = signal<boolean>(false);
  readonly serverError = signal<string | null>(null);
  readonly isEditMode = signal<boolean>(false);

  readonly form = this.fb.nonNullable.group({
    name: ['', [
      Validators.required,
      Validators.minLength(2),
      Validators.maxLength(100),
    ]],
    isAllergen: [false],
  });

  protected get name(): FormControl<string> {
    return this.form.controls.name;
  }

  ngOnInit(): void {
    const existing = this.ingredient();

    if (existing && existing.id) {
      // Real edit mode — entity exists in the backend
      this.isEditMode.set(true);
      this.form.patchValue({
        name: existing.name,
        isAllergen: existing.isAllergen,
      });
    } else if (existing) {
      // Prefill-only mode — the caller passed an `Ingredient` shape
      // with no id, used to pre-populate the form. Still create mode.
      this.form.patchValue({
        name: existing.name ?? '',
        isAllergen: existing.isAllergen ?? false,
      });
    }
  }

  protected nameError(): string | null {
    const c = this.name;
    if (!c.touched || !c.errors) return null;
    if (c.errors['required'])  return 'Le nom est requis';
    if (c.errors['minlength']) return 'Minimum 2 caractères';
    if (c.errors['maxlength']) return 'Maximum 100 caractères';
    return null;
  }

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

    const value = this.form.getRawValue();
    const request: IngredientRequest = {
      name: value.name.trim(),
      isAllergen: value.isAllergen,
    };

    const existing = this.ingredient();
    const op = existing?.id
      ? this.ingredientService.updateIngredient(existing.id, request)
      : this.ingredientService.createIngredient(request);

    op.subscribe({
      next: (ingredient) => {
        this.submitting.set(false);
        this.saved.emit(ingredient);
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
