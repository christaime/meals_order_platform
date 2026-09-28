import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  computed,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';

import {
  CategoryPillsSelectorComponent,
} from '@components/shared/category-pills-selector/category-pills-selector.component';
import { ImageUploaderComponent } from '@components/shared/image-uploader/image-uploader.component';

import { MediaRef, MediaUploadResponse } from '@app/core/models/marketplace';

/**
 * Step 1 — Identity.
 *
 * Fields:
 * - name (plain input)
 * - cuisineIds (CategoryPillsSelector, CUISINE, 1..3)
 * - dishTypeIds (CategoryPillsSelector, DISH_TYPE, 1..3)
 * - description (plain textarea)
 * - image (ImageUploader, in the left column)
 */
@Component({
  selector: 'app-step-identity',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    CategoryPillsSelectorComponent,
    ImageUploaderComponent,
  ],
  templateUrl: './step-identity.component.html',
  styleUrl: './step-identity.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StepIdentityComponent {

  readonly form = input.required<FormGroup>();

  // media:
  readonly imageMedia = input<MediaRef | null>(null);
  readonly imageUploaded = output<MediaUploadResponse>();
  readonly imageCleared = output<void>();

  // ─── Accessors ────────────────────────────────────────────
  protected get name(): FormControl<string> {
    return this.form().controls['name'] as FormControl<string>;
  }
  protected get description(): FormControl<string> {
    return this.form().controls['description'] as FormControl<string>;
  }
  protected get cuisineIds(): FormControl<string[]> {
    return this.form().controls['cuisineIds'] as FormControl<string[]>;
  }
  protected get dishTypeIds(): FormControl<string[]> {
    return this.form().controls['dishTypeIds'] as FormControl<string[]>;
  }

  protected readonly descriptionLength = computed(
    () => this.description.value?.length ?? 0
  );

  // ─── Errors ───────────────────────────────────────────────

  protected nameError(): string | null {
    const c = this.name;
    if (!c.touched || !c.errors) return null;
    if (c.errors['required'])  return 'Le nom est requis';
    if (c.errors['minlength']) return 'Minimum 3 caractères';
    if (c.errors['maxlength']) return 'Maximum 100 caractères';
    return null;
  }

  protected cuisineError(): string | null {
    const c = this.cuisineIds;
    if (!c.touched) return null;
    return (c.value ?? []).length === 0 ? 'Sélectionnez au moins une cuisine' : null;
  }

  protected dishTypeError(): string | null {
    const c = this.dishTypeIds;
    if (!c.touched) return null;
    return (c.value ?? []).length === 0 ? 'Sélectionnez au moins un type de plat' : null;
  }
}
