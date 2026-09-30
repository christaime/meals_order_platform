import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { IconComponent } from '@components/shared/icon/icon.component';
import { BadgeComponent } from '@components/shared/badge/badge.component';
import {
  isUnapproved,
  moderationIcon,
  moderationLabel,
  moderationVariant,
} from '@components/shared/moderation-status/moderation-status.util';

import { MEAL_SERVICE } from '@app/core/services/marketplace/meal.service';
import { Meal } from '@app/core/models/marketplace/meal.model';
import { IngredientSummary } from '@app/core/models/marketplace/ingredient.model';
import { LocationSummary } from '@app/core/models/marketplace/location.model';
import { ModerationStatus } from '@app/core/models/marketplace/enum-type.model';

/**
 * MealReferencesPanelComponent — admin-only sidebar panel.
 *
 * Given a selected meal ID, loads the full `Meal` and displays its
 * ingredients and distribution locations as badges. Unapproved items
 * are highlighted (danger variant + status icon) and sorted first.
 *
 * Clicking a badge opens the corresponding admin page in a new tab,
 * pre-filtered on that item:
 *   - ingredient → /admin/ingredients?name=<name>&focus=<id>
 *   - location   → /admin/locations?vendorId=<vendorId>&focus=<id>
 *
 * Read-only: moderation of the referenced items is done by approving
 * the meal itself (the backend cascades).
 */
@Component({
  selector: 'app-meal-references-panel',
  standalone: true,
  imports: [IconComponent, BadgeComponent],
  templateUrl: './meal-references-panel.component.html',
  styleUrl: './meal-references-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MealReferencesPanelComponent {

  private readonly mealService = inject(MEAL_SERVICE);
  private readonly destroyRef = inject(DestroyRef);

  /** The meal to inspect. `null` clears the panel. */
  readonly mealId = input<string | null>(null);

  protected readonly loading = signal<boolean>(false);
  protected readonly error = signal<boolean>(false);
  protected readonly meal = signal<Meal | null>(null);

  // ─── Derived lists, unapproved first ──────────────────────
  protected readonly ingredients = computed<IngredientSummary[]>(() =>
    this.sortUnapprovedFirst(this.meal()?.ingredients ?? []),
  );

  protected readonly locations = computed<LocationSummary[]>(() =>
    this.sortUnapprovedFirst(this.meal()?.distributionLocations ?? []),
  );

  protected readonly unapprovedCount = computed(() =>
    this.ingredients().filter(i => isUnapproved(i.moderationStatus)).length +
    this.locations().filter(l => isUnapproved(l.moderationStatus)).length,
  );

  // ─── Expose helpers to the template ───────────────────────
  protected readonly statusVariant  = moderationVariant;
  protected readonly statusLabel    = moderationLabel;
  protected readonly isUnapproved   = isUnapproved;
  protected readonly statusIconOrNull =
    (s: ModerationStatus): string | null => isUnapproved(s) ? moderationIcon(s) : null;

  constructor() {
    effect(() => {
      const id = this.mealId();
      if (!id) {
        this.meal.set(null);
        this.error.set(false);
        this.loading.set(false);
        return;
      }
      this.load(id);
    });
  }

  private load(id: string): void {
    this.loading.set(true);
    this.error.set(false);
    this.mealService.getMealById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (meal) => {
          this.meal.set(meal);
          this.loading.set(false);
        },
        error: (err) => {
          this.error.set(true);
          this.loading.set(false);
          console.error('[MealReferencesPanel] fetch error', err);
        },
      });
  }

  /**
   * Items whose moderationStatus !== 'APPROVED' come first, preserving
   * the original order within each group.
   */
  private sortUnapprovedFirst<T extends { moderationStatus: ModerationStatus }>(
    items: readonly T[],
  ): T[] {
    return [...items].sort((a, b) => {
      const au = isUnapproved(a.moderationStatus) ? 0 : 1;
      const bu = isUnapproved(b.moderationStatus) ? 0 : 1;
      return au - bu;
    });
  }

  // ─── Navigation ───────────────────────────────────────────
  protected openIngredient(ing: IngredientSummary): void {
    const url = `/admin/ingredients?name=${encodeURIComponent(ing.name)}&focus=${encodeURIComponent(ing.id)}`;
    window.open(url, '_blank', 'noopener');
  }

  protected openLocation(loc: LocationSummary): void {
    const vendorId = this.meal()?.vendorId ?? '';
    const url = `/admin/locations?name=${encodeURIComponent(loc.name)}&vendorId=${encodeURIComponent(vendorId)}&focus=${encodeURIComponent(loc.id)}`;
    window.open(url, '_blank', 'noopener');
  }
}
