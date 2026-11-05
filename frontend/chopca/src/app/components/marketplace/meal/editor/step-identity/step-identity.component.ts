import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  inject,
  signal,
  OnInit,
  DestroyRef,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import {
  CategoryPillsSelectorComponent,
} from '@components/shared/category-pills-selector/category-pills-selector.component';
import { ImageUploaderComponent } from '@components/shared/image-uploader/image-uploader.component';

import { MediaRef, MediaUploadResponse } from '@app/core/models/marketplace';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

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
    TranslatePipe,
  ],
  templateUrl: './step-identity.component.html',
  styleUrl: './step-identity.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StepIdentityComponent implements OnInit {

  private readonly destroyRef = inject(DestroyRef);
  private readonly translate = inject(TranslateService);

  readonly form = input.required<FormGroup>();

  // media:
  readonly imageMedia = input<MediaRef | null>(null);
  readonly imageUploaded = output<MediaUploadResponse>();
  readonly imageCleared = output<void>();

  // ─── Accessors ────────────────────────────────────────────
  //
  // Getters, not fields. `this.form()` reads an input, and inputs
  // are only bound from `ngOnInit` onward. A getter evaluates when
  // it's read (which is always after init, since the template and
  // the methods run later). A field initializer would run at
  // construction and throw NG0950.
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

  /** Mirrors the description value so the length can be reactive. */
  protected readonly descriptionLength = signal(0);

  // ─── Lifecycle ────────────────────────────────────────────

  ngOnInit(): void {
    // Seed once, then track changes.
    this.descriptionLength.set(this.description.value?.length ?? 0);

    this.description.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => this.descriptionLength.set((value ?? '').length));
  }

  // ─── Errors ───────────────────────────────────────────────

  protected nameError(): string | null {
    const c = this.name;
    if (!c.touched || !c.errors) return null;
    if (c.errors['required'])  return this.translate.instant('stepIdentity.errors.nameRequired');
    if (c.errors['minlength']) return this.translate.instant('stepIdentity.errors.nameMinLength');
    if (c.errors['maxlength']) return this.translate.instant('stepIdentity.errors.nameMaxLength');
    return null;
  }

  protected cuisineError(): string | null {
    const c = this.cuisineIds;
    if (!c.touched) return null;
    return (c.value ?? []).length === 0
      ? this.translate.instant('stepIdentity.errors.cuisineRequired')
      : null;
  }

  protected dishTypeError(): string | null {
    const c = this.dishTypeIds;
    if (!c.touched) return null;
    return (c.value ?? []).length === 0
      ? this.translate.instant('stepIdentity.errors.dishTypeRequired')
      : null;
  }
}
