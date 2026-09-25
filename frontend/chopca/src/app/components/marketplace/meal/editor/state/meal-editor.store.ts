import { Injectable, computed, signal, inject } from '@angular/core';

import { MEAL_SERVICE } from '@app/core/services/marketplace/meal.service';
import {
  Meal,
  MealRequest,
} from '@app/core/models/marketplace';

export type MealEditorStep = 1 | 2 | 3;

export type PublishStatus =
  | 'idle'
  | 'submitting'
  | 'success'
  | 'error';

/**
 * Signal-based store for the meal editor.
 *
 * Scope: it owns the LIFECYCLE of the editor — not the data.
 * Form data (name, price, ingredientIds, etc.) lives in the parent
 * FormGroup. This store only holds:
 *
 * - Current step
 * - Meal identity (id, mode: create vs edit)
 * - Dirty flag
 * - Publish status
 * - Loaded meal (edit mode)
 *
 * It's provided at the page/route level (`providers: [MealEditorStore]`),
 * NEVER `providedIn: 'root'`. A fresh instance per visit is required
 * so state doesn't leak across navigations.
 */
@Injectable()
export class MealEditorStore {

  private readonly mealService = inject(MEAL_SERVICE);

  // ───────────────────────────────────────────────────────────
  //  STEP
  // ───────────────────────────────────────────────────────────

  private readonly _step = signal<MealEditorStep>(1);
  readonly step = this._step.asReadonly();

  readonly isFirstStep = computed(() => this._step() === 1);
  readonly isLastStep = computed(() => this._step() === 3);

  // ───────────────────────────────────────────────────────────
  //  MEAL IDENTITY
  // ───────────────────────────────────────────────────────────

  /** The id of the meal being edited, or null in create mode. */
  private readonly _mealId = signal<string | null>(null);
  readonly mealId = this._mealId.asReadonly();

  private readonly _mode = signal<'create' | 'edit'>('create');
  readonly mode = this._mode.asReadonly();

  readonly isEditMode = computed(() => this._mode() === 'edit');

  // ───────────────────────────────────────────────────────────
  //  DIRTY TRACKING
  // ───────────────────────────────────────────────────────────

  private readonly _dirty = signal<boolean>(false);
  readonly dirty = this._dirty.asReadonly();

  // ───────────────────────────────────────────────────────────
  //  LOADED MEAL (edit mode)
  // ───────────────────────────────────────────────────────────

  private readonly _loadedMeal = signal<Meal | null>(null);
  readonly loadedMeal = this._loadedMeal.asReadonly();

  // ───────────────────────────────────────────────────────────
  //  PUBLISH
  // ───────────────────────────────────────────────────────────

  private readonly _publishStatus = signal<PublishStatus>('idle');
  readonly publishStatus = this._publishStatus.asReadonly();

  private readonly _publishError = signal<string | null>(null);
  readonly publishError = this._publishError.asReadonly();

  readonly isPublishing = computed(
    () => this._publishStatus() === 'submitting',
  );

  readonly publishSucceeded = computed(
    () => this._publishStatus() === 'success',
  );

  // ───────────────────────────────────────────────────────────
  //  LIFECYCLE — init
  // ───────────────────────────────────────────────────────────

  /** Initialize for "create" mode. Called by the page on first visit. */
  initCreate(): void {
    this._mode.set('create');
    this._step.set(1);
    this._mealId.set(null);
    this._loadedMeal.set(null);
    this._dirty.set(false);
    this._publishStatus.set('idle');
    this._publishError.set(null);
  }

  /**
   * Initialize for "edit" mode. The caller is responsible for
   * fetching the meal first, then passing it in.
   */
  initEdit(meal: Meal): void {
    this._mode.set('edit');
    this._step.set(1);
    this._mealId.set(meal.id);
    this._loadedMeal.set(meal);
    this._dirty.set(false);
    this._publishStatus.set('idle');
    this._publishError.set(null);
  }

  // ───────────────────────────────────────────────────────────
  //  DIRTY
  // ───────────────────────────────────────────────────────────

  /** Called by the form on any user-visible change. */
  markDirty(): void {
    if (!this._dirty()) this._dirty.set(true);
  }

  /** Called after a successful publish. */
  clearDirty(): void {
    this._dirty.set(false);
  }

  // ───────────────────────────────────────────────────────────
  //  NAVIGATION
  // ───────────────────────────────────────────────────────────

  goToStep(step: MealEditorStep): void {
    this._step.set(step);
  }

  next(): void {
    this._step.update(s => (s < 3 ? ((s + 1) as MealEditorStep) : s));
  }

  previous(): void {
    this._step.update(s => (s > 1 ? ((s - 1) as MealEditorStep) : s));
  }

  // ───────────────────────────────────────────────────────────
  //  PUBLISH
  // ───────────────────────────────────────────────────────────
  /**
   * Publish the meal (create or update). Called by the form after
   * validation passes. Returns the persisted Meal on success.
   *
   * `imageUrl` is the URL returned by the separate image upload API
   * (see ImageUploadService — designed later). Pass null if no image.
   */
  async publish(
    request: MealRequest,
    imageUrl: string | null,
  ): Promise<Meal> {
    if (this._publishStatus() === 'submitting') {
      throw new Error('Publish already in progress');
    }

    this._publishStatus.set('submitting');
    this._publishError.set(null);

    try {
      const payload: MealRequest = {
        ...request,
        imageUrl: imageUrl ?? undefined,
      };

      const meal =
        this.isEditMode() && this._mealId()
          ? await this.toPromise(
              this.mealService.updateMeal(this._mealId()!, payload),
            )
          : await this.toPromise(
              this.mealService.createMeal(payload),
            );

      this._publishStatus.set('success');
      this._mealId.set(meal.id);
      this._dirty.set(false);
      this._loadedMeal.set(meal);

      return meal;
    } catch (err: unknown) {
      this._publishStatus.set('error');
      this._publishError.set(this.extractErrorMessage(err));
      throw err;
    }
  }
  /** Reset the publish status back to idle (e.g. after toast closes). */
  clearPublishStatus(): void {
    this._publishStatus.set('idle');
    this._publishError.set(null);
  }

  // ───────────────────────────────────────────────────────────
  //  PRIVATE — HELPERS
  // ───────────────────────────────────────────────────────────

  private toPromise<T>(obs: import('rxjs').Observable<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      obs.subscribe({ next: resolve, error: reject });
    });
  }

  private extractErrorMessage(err: unknown): string {
    if (typeof err === 'object' && err !== null) {
      const anyErr = err as {
        error?: { message?: string };
        message?: string;
      };
      return (
        anyErr.error?.message ??
        anyErr.message ??
        'Une erreur est survenue. Veuillez réessayer.'
      );
    }
    return 'Une erreur est survenue. Veuillez réessayer.';
  }
}
