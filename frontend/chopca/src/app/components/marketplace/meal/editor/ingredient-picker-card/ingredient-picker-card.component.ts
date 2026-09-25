import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  signal,
  computed,
  inject,
  OnInit,
  OnDestroy,
  DestroyRef,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged, switchMap, of } from 'rxjs';

import { IconComponent } from '@components/shared/icon/icon.component';
import { FormErrorComponent } from '@components/shared/form-error/form-error.component';
import { INPUT_CLASSES } from '@components/shared/form-field/input-classes';

import { IngredientPillComponent } from '../ingredient-pill/ingredient-pill.component';
import { IngredientSuggestionsComponent } from '../ingredient-suggestions/ingredient-suggestions.component';
import { NewIngredientFormComponent } from '@components/marketplace/ingredient/editor/new-ingredient-form/new-ingredient-form.component';

import { INGREDIENT_SERVICE } from '@app/core/services/marketplace/ingredient.service';
import {
  Ingredient,
  IngredientSummary,
} from '@app/core/models/marketplace';

/**
 * Step 2 — Ingredient picker card.
 *
 * Lets the vendor:
 * 1. Search existing ingredients (with autocomplete dropdown)
 * 2. Add them to the meal's ingredient list
 * 3. Remove them (via pills)
 * 4. Add suggestions with a single click
 * 5. Create brand-new ingredients inline
 *
 * The selection is stored in a parent-owned FormControl of type string[]
 * (list of ingredient IDs). The card keeps a local cache of the
 * IngredientSummary objects for rendering.
 */
@Component({
  selector: 'app-ingredient-picker-card',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    IconComponent,
    FormErrorComponent,
    IngredientPillComponent,
    IngredientSuggestionsComponent,
    NewIngredientFormComponent,
  ],
  templateUrl: './ingredient-picker-card.component.html',
  styleUrl: './ingredient-picker-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IngredientPickerCardComponent implements OnInit, OnDestroy {

  private readonly ingredientService = inject(INGREDIENT_SERVICE);
  private readonly destroyRef = inject(DestroyRef);

  // ─── Inputs ───────────────────────────────────────────────
  /** FormControl holding the list of selected ingredient IDs. */
  readonly control = input.required<FormControl<string[]>>();

  /** Optional error from the parent. */
  readonly error = input<string | null>(null);

  // ─── Outputs ──────────────────────────────────────────────
  /** Emits when the selection changes. */
  readonly selectionChange = output<string[]>();

  // ─── Exposed for the template ─────────────────────────────
  protected readonly INPUT_CLASSES = INPUT_CLASSES;

  // ─── Selected ingredients ─────────────────────────────────
  /** Current selected IDs (mirrored from the control). */
  readonly selectedIds = signal<string[]>([]);

  /**
   * Cache of the full IngredientSummary objects for every selected ID.
   * The FormControl only knows the IDs — we keep the display data here.
   */
  private readonly ingredientCache = signal<Map<string, IngredientSummary>>(
    new Map(),
  );

  /** Selected ingredients as full summaries, ordered by selection. */
  protected readonly selectedIngredients = computed<IngredientSummary[]>(() => {
    const cache = this.ingredientCache();
    return this.selectedIds()
      .map(id => cache.get(id))
      .filter((i): i is IngredientSummary => !!i);
  });

  protected readonly selectedCount = computed(
    () => this.selectedIds().length,
  );

  /** Names already selected — used to filter suggestions. */
  protected readonly selectedNames = computed(() =>
    this.selectedIngredients().map(i => i.name),
  );

  // ─── Search ───────────────────────────────────────────────
  /** Text typed by the user in the search box. */
  readonly searchTerm = signal<string>('');

  /** Results from the API for the current search term. */
  private readonly searchResults = signal<IngredientSummary[]>([]);

  /** Whether a search request is in flight. */
  protected readonly isSearchLoading = signal<boolean>(false);

  /** Filtered results — hide already-selected ingredients. */
  protected readonly visibleSearchResults = computed(() =>
    this.searchResults().filter(
      r => !this.selectedIds().includes(r.id),
    ),
  );

  /** True when the user has typed a long-enough search term. */
  protected readonly isSearching = computed(
    () => this.searchTerm().trim().length >= 2,
  );

  /** True when the search yielded no results. */
  protected readonly showNoResults = computed(
    () =>
      this.isSearching() &&
      !this.isSearchLoading() &&
      this.searchResults().length === 0,
  );

  // ─── Allergen preview ─────────────────────────────────────
  protected readonly allergenNames = computed(() =>
    this.selectedIngredients()
      .filter(i => i.isAllergen)
      .map(i => i.name),
  );

  protected readonly hasAllergens = computed(
    () => this.allergenNames().length > 0,
  );

  // ─── Lifecycle ────────────────────────────────────────────

  ngOnInit(): void {
    const ctrl = this.control();

    // Seed the internal signal with the initial value.
    this.selectedIds.set(ctrl.value ?? []);

    // Keep in sync with external value changes (parent resets, form patch, etc.).
    ctrl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value: string[] | null) => {
        this.selectedIds.set(value ?? []);
      });

    // Prefetch the summaries for whatever was already selected.
    this.prefetchMissingSummaries(this.selectedIds());
  }

  ngOnDestroy(): void {
    // DestroyRef handles unsubscribe — nothing to do.
  }

  // ─── Search flow ──────────────────────────────────────────

  protected onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchTerm.set(value);

    if (value.trim().length < 2) {
      this.searchResults.set([]);
      this.isSearchLoading.set(false);
      return;
    }

    this.isSearchLoading.set(true);

    // Debounced search — see initSearchSubscription below.
    this.triggerSearch(value.trim());
  }

  private searchTimer?: ReturnType<typeof setTimeout>;

  private triggerSearch(keyword: string): void {
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.ingredientService.searchIngredients({ keyword, size: 10 })
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (results) => {
            this.searchResults.set(results?.content);
            this.isSearchLoading.set(false);
          },
          error: (err) => {
            console.error('[IngredientPicker] search error', err);
            this.searchResults.set([]);
            this.isSearchLoading.set(false);
          },
        });
    }, 250);
  }

  // ─── Actions ──────────────────────────────────────────────

  protected onAddResult(ingredient: IngredientSummary): void {
    this.addIngredient(ingredient);
    this.searchTerm.set('');
    this.searchResults.set([]);
  }

  protected onSuggestionAdded(name: string): void {
    // The suggestion is just a name — look up the actual ingredient
    // to get its ID and metadata.
    this.ingredientService.searchIngredients({ keyword: name, size: 1 })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (results) => {
          const match = results?.content?.find(
            r => r.name.toLowerCase() === name.toLowerCase(),
          );
          if (match) {
            this.addIngredient(match);
          } else {
            console.warn('[IngredientPicker] suggestion not found:', name);
          }
        },
        error: (err) => console.error('[IngredientPicker] suggestion lookup error', err),
      });
  }

  protected onRemove(ingredient: IngredientSummary): void {
    const next = this.selectedIds().filter(id => id !== ingredient.id);
    this.commitSelection(next);
  }

  protected onNewIngredientCreated(ingredient: Ingredient): void {
    this.addIngredient(ingredient);
  }

  // ─── Helpers ──────────────────────────────────────────────

  private addIngredient(ingredient: Ingredient | IngredientSummary): void {
    if (this.selectedIds().includes(ingredient.id)) return;

    // Ensure the summary is cached.
    const summary = this.toSummary(ingredient);
    const cache = new Map(this.ingredientCache());
    cache.set(summary.id, summary);
    this.ingredientCache.set(cache);

    const nextIds = [...this.selectedIds(), summary.id];
    this.commitSelection(nextIds);
  }

  private commitSelection(ids: string[]): void {
    this.selectedIds.set(ids);
    this.control().setValue(ids);
    this.control().markAsTouched();
    this.selectionChange.emit(ids);
  }

  private toSummary(ingredient: Ingredient | IngredientSummary): IngredientSummary {
    return {
      id: ingredient.id,
      name: ingredient.name,
      isAllergen: ingredient.isAllergen,
      moderationStatus: (ingredient as any).moderationStatus ?? 'APPROVED',
    } as IngredientSummary;
  }

  /**
   * Prefetch full summaries for any selected IDs that aren't in the cache.
   * Called once on init to hydrate the pills when editing an existing meal.
   */
  private prefetchMissingSummaries(ids: string[]): void {
    if (!ids.length) return;

    const cache = this.ingredientCache();
    const missing = ids.filter(id => !cache.has(id));
    if (!missing.length) return;

    this.ingredientService.getIngredientsByIds(missing)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (ingredients) => {
          const next = new Map(this.ingredientCache());
          for (const ing of ingredients) {
            next.set(ing.id, this.toSummary(ing));
          }
          this.ingredientCache.set(next);
        },
        error: (err) => console.error('[IngredientPicker] prefetch error', err),
      });
  }
}
