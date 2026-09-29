import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  OnInit,
  DestroyRef,
  viewChild,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatStepperModule } from '@angular/material/stepper';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';

import { StepIdentityComponent } from '../../../marketplace/meal/editor/step-identity/step-identity.component';
import { StepCompositionComponent } from '../../../marketplace/meal/editor/step-composition/step-composition.component';
import { StepPricingComponent } from '../../../marketplace/meal/editor/step-pricing/step-pricing.component';

import { MEAL_SERVICE } from '@app/core/services/marketplace/meal.service';
import { CATEGORY_SERVICE } from '@app/core/services/marketplace/category.service';
import { Meal, MealRequest,MediaRef,
  MediaUploadResponse, MediaPurpose ,
   MealSummary , CategorySummary} from '@app/core/models/marketplace';

import { MealCardComponent, MealCardSkeletonComponent } from '@components/marketplace/meal/view';
import { MEDIA_SERVICE } from '@app/core/services/marketplace/media.service';

/**
 * Meal editor page.
 *
 * Routes:
 *   /vendor/meals/new          → create mode
 *   /vendor/meals/:id/edit     → edit mode
 *
 * Uses a mat-stepper with 3 steps. The page owns the FormGroup;
 * each step component receives it via input and maps controls to fields.
 */
@Component({
  selector: 'app-meal-editor-page',
  standalone: true,
  imports: [
    RouterLink,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatStepperModule,
    MatProgressSpinnerModule,
    StepIdentityComponent,
    StepCompositionComponent,
    StepPricingComponent,
    MealCardComponent,
    MealCardSkeletonComponent
  ],
  templateUrl: './meal-editor.page.html',
  styleUrl: './meal-editor.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MealEditorPageComponent implements OnInit {

  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly mealService = inject(MEAL_SERVICE);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);
  private readonly categoryService = inject(CATEGORY_SERVICE);
  private readonly mediaService = inject(MEDIA_SERVICE);

  private readonly stepper = viewChild<import('@angular/material/stepper').MatStepper>('stepper');

  // ─── State ────────────────────────────────────────────────
  protected readonly isLoading = signal<boolean>(false);
  protected readonly loadError = signal<string | null>(null);
  protected readonly submitting = signal<boolean>(false);
  protected readonly submitError = signal<string | null>(null);
  protected readonly isEditMode = signal<boolean>(false);

//  Image management
  protected readonly imageMediaId = signal<string | null>(null);
  protected readonly imageUrl = signal<string | null>(null);

  protected readonly imageMediaRef = computed<MediaRef | null>(() => {
    const id = this.imageMediaId();
    const url = this.imageUrl();
    return id && url ? { id, url } : null;
  });

  protected onImageUploaded(result: MediaUploadResponse): void {
    console.log("image in page ", result);
    this.imageMediaId.set(result.storageRef);
    this.imageUrl.set(result.url);
  }

  protected onImageCleared(): void {
    this.imageMediaId.set(null);
    this.imageUrl.set(null);
  }

  // ─── Form ─────────────────────────────────────────────────
  readonly form = this.fb.nonNullable.group({
    // Step 1
    name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
    cuisineIds: [[] as string[], [Validators.required, Validators.minLength(1)]],
    dishTypeIds: [[] as string[], [Validators.required, Validators.minLength(1)]],
    description: ['', [Validators.maxLength(300)]],

    // Step 2
    prepTimeMinutes: [30 as number | null, [Validators.required]],  // default 30 min
    ingredientIds: [[] as string[], [Validators.required, Validators.minLength(1)]],

    // Step 3
    price: [null as number | null, [
      Validators.required,
      Validators.min(100),
      Validators.max(1_000_000),
    ]],
    promoPrice: [null as number | null],
    distributionLocationIds: [[] as string[]],   // OPTIONAL
  });

  // ─── Derived ──────────────────────────────────────────────
  protected readonly pageTitle = computed(() =>
    this.isEditMode() ? 'Modifier un plat' : 'Nouveau plat'
  );

  protected readonly pageSubtitle = computed(() =>
    this.isEditMode()
      ? 'Mettez à jour les informations de votre spécialité.'
      : 'Renseignez les informations de votre nouvelle spécialité en 3 étapes.'
  );

  private readonly _formValue = signal(this.form.getRawValue());

  /**
   * Live MealSummary derived from the current form value.
   * Returns null when there isn't enough data to show a meaningful preview
   * (name or price missing). The template falls back to the skeleton in that case.
   */
  protected readonly previewMeal = computed<MealSummary | null>(() => {
    const v = this._formValue();

    const name = (v.name ?? '').trim();
    const price = v.price;

    if (!name || price == null) return null;

    return {
      id: '',                                       // not published yet
      vendorId: '',                                 // resolved server-side
      vendorBusinessName: 'Ma cuisine',             // TODO: replace with vendor name from auth/context
      name,
      description: (v.description ?? '').trim() || null,
      price,
      imageUrl: this.imageUrl(),
      isAvailable: true,
      averageRating: 0,
      totalRatings: 0,
      prepTimeMinutes: v.prepTimeMinutes ?? null,
      cuisines: this.resolveCategories(v.cuisineIds, 'cuisine'),
      dishTypes: this.resolveCategories(v.dishTypeIds, 'dishType'),
      moderationStatus: 'PENDING',
    };
  });

  /**
   * Categories are loaded once and cached. We resolve IDs → CategorySummary
   * for the preview, so the card can display cuisine names.
   */
  private readonly cuisineCatalog = signal<CategorySummary[]>([]);
  private readonly dishTypeCatalog = signal<CategorySummary[]>([]);

  private resolveCategories(ids: string[] | undefined, kind: 'cuisine' | 'dishType'): CategorySummary[] {
    if (!ids?.length) return [];
    const catalog = kind === 'cuisine' ? this.cuisineCatalog() : this.dishTypeCatalog();
    return catalog.filter(c => ids.includes(c.id));
  }

  constructor() {
    this.form.valueChanges
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => this._formValue.set(this.form.getRawValue()));
  }

  // ─── Lifecycle ────────────────────────────────────────────

  ngOnInit(): void {
    this.loadCategories();
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadForEdit(id);
    }
  }

  private loadCategories(): void {
    this.categoryService.searchCategories({ type: 'CUISINE', size: 100 })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(page => this.cuisineCatalog.set(page.content));

    this.categoryService.searchCategories({ type: 'DISH_TYPE', size: 100 })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(page => this.dishTypeCatalog.set(page.content));
  }

  private loadForEdit(id: string): void {
    this.isLoading.set(true);
    this.loadError.set(null);
    this.isEditMode.set(true);

    this.mealService
      .getMealById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (meal) => {
          this.patchForm(meal);
          this.imageUrl.set(meal.imageUrl);
          this.imageMediaId.set(meal.imageStorageRef);
          this.isLoading.set(false);
        },
        error: (err) => {
          console.error('[MealEditorPage] load error', err);
          this.loadError.set(
            err?.error?.message ?? 'Impossible de charger ce plat.'
          );
          this.isLoading.set(false);
        },
      });
  }

  private patchForm(meal: Meal): void {
    this.form.patchValue({
      name: meal.name,
      cuisineIds: meal.cuisines.map(c => c.id),
      dishTypeIds: meal.dishTypes.map(c => c.id),
      description: meal.description ?? '',
      prepTimeMinutes: meal.prepTimeMinutes,
      ingredientIds: meal.ingredients.map(i => i.id),
      price: meal.price,
      promoPrice: null,
      distributionLocationIds: meal.distributionLocations.map(l => l.id),
    });
  }

  // ─── Submit ───────────────────────────────────────────────

  onSubmit(): void {
    if (this.submitting()) return;

    this.form.markAllAsTouched();

    if (this.form.invalid) {
      this.jumpToFirstInvalidStep();
      this.snackBar.open(
        'Veuillez corriger les erreurs avant de publier.',
        'OK',
        { duration: 4000 },
      );
      return;
    }

    this.submitting.set(true);
    this.submitError.set(null);

    const request = this.buildRequest();
    const id = this.route.snapshot.paramMap.get('id');

    const op = id
      ? this.mealService.updateMeal(id, request)
      : this.mealService.createMeal(request);
    console.log("request ",{request});
    op.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.submitting.set(false);
        this.snackBar.open(
          this.isEditMode()
            ? 'Plat mis à jour avec succès !'
            : 'Plat publié avec succès !',
          'OK',
          { duration: 4000 },
        );
        this.router.navigate(['/vendor/meals']);
      },
      error: (err) => {
        this.submitting.set(false);
        const message =
          err?.error?.message ?? 'Une erreur est survenue. Veuillez réessayer.';
        this.submitError.set(message);
        this.snackBar.open(message, 'OK', { duration: 5000 });
      },
    });
  }

  private buildRequest(): MealRequest {
    const v = this.form.getRawValue();

    const request: MealRequest = {
      name: v.name.trim(),
      description: v.description?.trim() || undefined,
      price: v.price!,
      prepTimeMinutes: v.prepTimeMinutes ?? undefined,
      categoryIds: [...v.cuisineIds, ...v.dishTypeIds],
      ingredientIds: v.ingredientIds.length ? v.ingredientIds : undefined,
      distributionLocationIds: v.distributionLocationIds.length
        ? v.distributionLocationIds
        : undefined,
      imageUrl: this.imageUrl() ?? undefined,
      imageStorageRef: this.imageMediaId()
    };

    // isAvailable only sent on update (per Q3-C decision)
    if (this.isEditMode()) {
      request.isAvailable = true;
    }

    return request;
  }

  private jumpToFirstInvalidStep(): void {
    const stepForControl: Record<string, number> = {
      name: 0, cuisineIds: 0, dishTypeIds: 0, description: 0,
      prepTimeMinutes: 1, ingredientIds: 1,
      price: 2, promoPrice: 2, distributionLocationIds: 2,
    };

    for (const [key, ctrl] of Object.entries(this.form.controls)) {
      if (ctrl.invalid) {
        const index = stepForControl[key];
        const stepper = this.stepper();
        if (index != null && stepper ) {
          stepper.selectedIndex = index;
        }
        return;
      }
    }
  }

  onCancel(): void {
    if (this.form.dirty) {
      const ok = window.confirm(
        'Vous avez des modifications non enregistrées. Quitter ?'
      );
      if (!ok) return;
    }
    this.router.navigate(['/vendor/meals']);
  }
}
