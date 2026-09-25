import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  inject,
  signal,
  computed,
  OnInit,
  DestroyRef,
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormControl,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { MealEditorStore, MealEditorStep } from '@components/marketplace/meal/editor/state/meal-editor.store';

import { StepIdentityComponent } from '../step-identity/step-identity.component';
import { StepCompositionComponent } from '../step-composition/step-composition.component';
import { StepPricingComponent } from '../step-pricing/step-pricing.component';

import { MealRequest } from '@app/core/models/marketplace';

/**
 * Master form for the meal editor.
 *
 * Owns:
 * - The single FormGroup that holds ALL meal data across all 3 steps.
 *   Because this component is never destroyed while the editor is open,
 *   the form data survives step transitions automatically.
 * - Maps the FormGroup → MealRequest at publish time.
 * - Delegates lifecycle state (step, mode, publish) to MealEditorStore.
 *
 * The parent page component is responsible for calling
 * store.initCreate() or store.initEdit(meal) before rendering this.
 */
@Component({
  selector: 'app-meal-editor-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    StepIdentityComponent,
    StepCompositionComponent,
    StepPricingComponent,
  ],
  templateUrl: './meal-editor-form.component.html',
  styleUrl: './meal-editor-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MealEditorFormComponent implements OnInit {

  private readonly fb = inject(FormBuilder);
  private readonly store = inject(MealEditorStore);
  private readonly destroyRef = inject(DestroyRef);

  // ─── Inputs ───────────────────────────────────────────────
  /** Initial image URL when editing an existing meal. */
  readonly initialImageUrl = input<string | null>(null);

  /**
   * The URL of the uploaded image, if any.
   * Parent updates this when the image upload API returns.
   */
  readonly uploadedImageUrl = input<string | null>(null);

  /** Optional supplier for step navigation buttons (wired by parent). */
  readonly currentStep = input<MealEditorStep>(1);

  // ─── Outputs ──────────────────────────────────────────────
  readonly published = output<void>();
  readonly cancelled = output<void>();
  readonly previous  = output<void>();
  readonly next      = output<void>();
  readonly saveDraft = output<void>();

  // ─── Exposed for the template ─────────────────────────────
  protected readonly store2 = this.store; // avoid name clash with `store` above

  // ─── Form ─────────────────────────────────────────────────
  readonly form = this.fb.nonNullable.group({
    // Step 1 — Identity
    name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
    cuisineIds: [[] as string[], [Validators.required, Validators.minLength(1)]],
    dishTypeIds: [[] as string[], [Validators.required, Validators.minLength(1)]],
    description: ['', [Validators.maxLength(300)]],

    // Step 2 — Composition
    prepTimeMinutes: [null as number | null, [Validators.required]],
    ingredientIds: [[] as string[], [Validators.required, Validators.minLength(1)]],

    // Step 3 — Pricing & Distribution
    supplementIds: [[] as string[]],
    price: [null as number | null, [
      Validators.required,
      Validators.min(100),
      Validators.max(1_000_000),
    ]],
    promoPrice: [null as number | null],
    distributionLocationIds: [[] as string[]],   // OPTIONAL
  });

  // ─── Derived ──────────────────────────────────────────────
  protected readonly currentStepView = computed<MealEditorStep>(() => {
    const s = this.store.step();
    return s;
  });

  // ─── Lifecycle ────────────────────────────────────────────

  ngOnInit(): void {
    this.patchFromStore();

    // Any change → mark dirty in the store
    this.form.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.store.markDirty());
  }

  private patchFromStore(): void {
    const meal = this.store.loadedMeal();
    if (!meal) return;

    this.form.patchValue({
      name: meal.name,
      cuisineIds: meal.cuisines.map(c => c.id),
      dishTypeIds: meal.dishTypes.map(c => c.id),
      description: meal.description ?? '',
      prepTimeMinutes: meal.prepTimeMinutes,
      ingredientIds: meal.ingredients.map(i => i.id),
      supplementIds: meal.supplements.map(s => s.id),
      price: meal.price,
      promoPrice: null,   // backend doesn't return promoPrice yet
      distributionLocationIds: meal.distributionLocations.map(l => l.id),
    });
  }

  // ─── Public API (used by the page) ────────────────────────

  /**
   * Attempt to publish the meal. Called by the page when the
   * "Valider et publier" button is clicked.
   */
  async publish(): Promise<void> {
    this.form.markAllAsTouched();

    if (this.form.invalid) {
      this.focusFirstInvalidStep();
      return;
    }

    const request = this.buildRequest();
    const imageUrl = this.uploadedImageUrl() ?? this.initialImageUrl();

    try {
      await this.store.publish(request, imageUrl);
      this.published.emit();
    } catch {
      // Error is stored in the store — page reads publishError()
    }
  }

  // ─── Helpers ──────────────────────────────────────────────

  private buildRequest(): MealRequest {
    const v = this.form.getRawValue();

    // Merge cuisines + dish types into a single categoryIds array
    const categoryIds = [...v.cuisineIds, ...v.dishTypeIds];

    const request: MealRequest = {
      name: v.name.trim(),
      description: v.description?.trim() || undefined,
      price: v.price!,
      prepTimeMinutes: v.prepTimeMinutes ?? undefined,
      categoryIds,
      ingredientIds: v.ingredientIds.length ? v.ingredientIds : undefined,
      distributionLocationIds: v.distributionLocationIds.length
        ? v.distributionLocationIds
        : undefined,
      supplementIds: v.supplementIds.length ? v.supplementIds : undefined,
    };

    // isAvailable: only sent on UPDATE (per Q3-C decision)
    if (this.store.isEditMode()) {
      request.isAvailable = true;   // or read from the form if you add a toggle
    }

    // promoPrice: not in MealRequest yet — we send it as a future extension.
    // If your backend has promoPrice, add it to MealRequest and send here.
    // if (v.promoPrice != null) request.promoPrice = v.promoPrice;

    return request;
  }

  private focusFirstInvalidStep(): void {
    // Determine which step has the first invalid control and navigate there
    const invalid = this.findFirstInvalidControl();
    if (!invalid) return;

    const stepForControl: Record<string, MealEditorStep> = {
      name: 1, cuisineIds: 1, dishTypeIds: 1, description: 1,
      prepTimeMinutes: 2, ingredientIds: 2,
      supplementIds: 3, price: 3, promoPrice: 3, distributionLocationIds: 3,
    };

    const step = stepForControl[invalid];
    if (step) this.store.goToStep(step);
  }

  private findFirstInvalidControl(): string | null {
    for (const [key, ctrl] of Object.entries(this.form.controls)) {
      if (ctrl.invalid) return key;
    }
    return null;
  }
}
