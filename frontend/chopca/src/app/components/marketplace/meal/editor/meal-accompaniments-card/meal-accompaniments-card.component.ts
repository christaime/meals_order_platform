import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  signal,
  computed,
  inject,
  OnInit,
  DestroyRef,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { IconComponent } from '@components/shared/icon/icon.component';
import { FormErrorComponent } from '@components/shared/form-error/form-error.component';
import { INPUT_CLASSES } from '@components/shared/form-field/input-classes';

import { PaidSupplementRowComponent } from '../paid-supplement-row/paid-supplement-row.component';

import { MEAL_SERVICE } from '@app/core/services/marketplace/meal.service';
import {
  MealSummary,
  MealSearchRequest,
} from '@app/core/models/marketplace';

/**
 * Step 3 — Paid accompaniments card (category-based picker).
 *
 * Supplements are meals that belong to the SUPPLEMENT category.
 * The vendor picks from their own catalogue of such meals.
 *
 * The selection is stored in a parent-owned FormControl of type
 * string[] (list of meal IDs). The card keeps a local cache of
 * MealSummary objects for rendering.
 */
@Component({
  selector: 'app-meal-accompaniments-card',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    IconComponent,
    FormErrorComponent,
    PaidSupplementRowComponent,
  ],
  templateUrl: './meal-accompaniments-card.component.html',
  styleUrl: './meal-accompaniments-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MealAccompanimentsCardComponent implements OnInit {

  private readonly mealService = inject(MEAL_SERVICE);
  private readonly destroyRef = inject(DestroyRef);

  /** Category ID for supplements. Configurable so it's not hardcoded. */
  readonly supplementCategoryId = input<string>('cat-supplement');

  /** FormControl holding the selected supplement meal IDs. */
  readonly control = input.required<FormControl<string[]>>();

  readonly error = input<string | null>(null);

  readonly selectionChange = output<string[]>();

  protected readonly INPUT_CLASSES = INPUT_CLASSES;

  // ─── Search ───────────────────────────────────────────────
  readonly searchTerm = signal<string>('');
  private readonly searchResults = signal<MealSummary[]>([]);
  protected readonly isSearchLoading = signal<boolean>(false);

  protected readonly visibleSearchResults = computed(() =>
    this.searchResults().filter(r => !this.selectedIds().includes(r.id)),
  );

  protected readonly isSearching = computed(
    () => this.searchTerm().trim().length >= 2,
  );

  protected readonly showNoResults = computed(
    () => this.isSearching() && !this.isSearchLoading() && this.searchResults().length === 0,
  );

  // ─── Selection ────────────────────────────────────────────
  readonly selectedIds = signal<string[]>([]);

  private readonly supplementCache = signal<Map<string, MealSummary>>(new Map());

  protected readonly selectedSupplements = computed<MealSummary[]>(() => {
    const cache = this.supplementCache();
    return this.selectedIds()
      .map(id => cache.get(id))
      .filter((m): m is MealSummary => !!m);
  });

  protected readonly count = computed(() => this.selectedIds().length);

  // ─── Lifecycle ────────────────────────────────────────────

  ngOnInit(): void {
    const ctrl = this.control();
    this.selectedIds.set(ctrl.value ?? []);

    ctrl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value: string[] | null) => {
        this.selectedIds.set(value ?? []);
      });

    this.prefetchMissingSummaries(this.selectedIds());
  }

  // ─── Search ───────────────────────────────────────────────

  protected onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchTerm.set(value);

    if (value.trim().length < 2) {
      this.searchResults.set([]);
      this.isSearchLoading.set(false);
      return;
    }

    this.isSearchLoading.set(true);
    this.triggerSearch(value.trim());
  }

  private searchTimer?: ReturnType<typeof setTimeout>;

  private triggerSearch(keyword: string): void {
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      const request: MealSearchRequest = {
        keyword,
        cuisineIds: undefined,
        dishTypeIds: [this.supplementCategoryId()],   // filter by DISH_TYPE category
        size: 10,
      };

      this.mealService.search(request)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (page) => {
            this.searchResults.set(page.content);
            this.isSearchLoading.set(false);
          },
          error: (err) => {
            console.error('[Accompaniments] search error', err);
            this.searchResults.set([]);
            this.isSearchLoading.set(false);
          },
        });
    }, 250);
  }

  // ─── Actions ──────────────────────────────────────────────

  protected onAddResult(meal: MealSummary): void {
    this.addSupplement(meal);
    this.searchTerm.set('');
    this.searchResults.set([]);
  }

  protected onRemove(meal: MealSummary): void {
    const next = this.selectedIds().filter(id => id !== meal.id);
    this.commitSelection(next);
  }

  // ─── Helpers ──────────────────────────────────────────────

  private addSupplement(meal: MealSummary): void {
    if (this.selectedIds().includes(meal.id)) return;

    const cache = new Map(this.supplementCache());
    cache.set(meal.id, meal);
    this.supplementCache.set(cache);

    this.commitSelection([...this.selectedIds(), meal.id]);
  }

  private commitSelection(ids: string[]): void {
    this.selectedIds.set(ids);
    this.control().setValue(ids);
    this.control().markAsTouched();
    this.selectionChange.emit(ids);
  }

  private prefetchMissingSummaries(ids: string[]): void {
    if (!ids.length) return;

    const cache = this.supplementCache();
    const missing = ids.filter(id => !cache.has(id));
    if (!missing.length) return;

    this.mealService.getMealsByIds(missing)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (meals) => {
          const next = new Map(this.supplementCache());
          for (const m of meals) next.set(m.id, m);
          this.supplementCache.set(next);
        },
        error: (err) => console.error('[Accompaniments] prefetch error', err),
      });
  }
}
