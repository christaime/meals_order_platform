import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { IconComponent } from '@components/shared/icon/icon.component';
import { INGREDIENT_SERVICE } from '@app/core/services/marketplace/ingredient.service';
import { Ingredient, IngredientRequest } from '@app/core/models/marketplace';

/**
 * Ingredient create / edit form.
 *
 * Card-style layout mirroring `CategoryFormComponent`. Tailwind inputs,
 * no Angular Material.
 *
 * Owns the HTTP call. Emits the persisted `Ingredient` on success.
 *
 * Modes:
 *  - Edit:    `ingredient` has a non-empty `id` → calls `updateIngredient`.
 *  - Prefill: `ingredient` has no `id` → calls `createIngredient`, form
 *             starts pre-filled (used by the dialog for quick-create).
 *  - Create:  `ingredient` is null → blank form.
 */
@Component({
  selector: 'app-ingredient-form',
  standalone: true,
  imports: [ReactiveFormsModule, IconComponent],
  templateUrl: './ingredient-form.component.html',
  styleUrl: './ingredient-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IngredientFormComponent {

  private readonly fb = inject(FormBuilder);
  private readonly ingredientService = inject(INGREDIENT_SERVICE);

  /** Existing (edit) / partial prefill (create with defaults) / null (blank). */
  readonly ingredient = input<Ingredient | Partial<Ingredient> | null>(null);

  /** When true (default), the form clears itself when `ingredient` becomes null. */
  readonly autoReset = input<boolean>(true);

  /** Fires with the persisted entity after a successful save. */
  readonly saved = output<Ingredient>();

  /** Fires when the user clicks Annuler / Réinitialiser. */
  readonly cancelled = output<void>();

  readonly submitting  = signal<boolean>(false);
  readonly serverError = signal<string | null>(null);

  /** Recomputed whenever `ingredient` changes. */
  readonly isEditMode = computed<boolean>(() => {
    const ing = this.ingredient();
    return !!(ing && 'id' in ing && ing.id);
  });

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [
      Validators.required,
      Validators.minLength(2),
      Validators.maxLength(100),
    ]],
    isAllergen: [false],
  });

  constructor() {
    effect(() => {
      const ing = this.ingredient();

      if (ing) {
        this.form.reset({
          name: ing.name ?? '',
          isAllergen: ing.isAllergen ?? false,
        });
      } else if (this.autoReset()) {
        this.form.reset({ name: '', isAllergen: false });
      }

      this.serverError.set(null);
    });
  }

  protected onSubmit(): void {
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

    const ing = this.ingredient();
    const op = ing && 'id' in ing && ing.id
      ? this.ingredientService.updateIngredient(ing.id, request)
      : this.ingredientService.createIngredient(request);

    op.subscribe({
      next: saved => {
        this.submitting.set(false);
        this.saved.emit(saved);
      },
      error: err => {
        this.submitting.set(false);
        this.serverError.set(
          err?.error?.message ?? 'Une erreur est survenue. Veuillez réessayer.',
        );
      },
    });
  }

  protected onReset(): void {
    if (this.submitting()) return;
    if (this.isEditMode()) {
      this.cancelled.emit();
    } else {
      this.form.reset({ name: '', isAllergen: false });
      this.serverError.set(null);
    }
  }
}
