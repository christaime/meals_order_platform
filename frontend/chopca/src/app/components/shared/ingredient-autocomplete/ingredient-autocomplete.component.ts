import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  inject,
  signal,
  computed,
  DestroyRef,
  linkedSignal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  debounceTime,
  distinctUntilChanged,
  switchMap,
  catchError,
  of,
} from 'rxjs';

import { IconComponent } from '@components/shared/icon/icon.component';
import { INGREDIENT_SERVICE } from '@app/core/services/marketplace/ingredient.service';
import { IngredientSummary } from '@app/core/models/marketplace';

const SEARCH_DEBOUNCE_MS = 200;
const SEARCH_RESULT_LIMIT = 10;

/**
 * Multi-select autocomplete for ingredients, used to build an
 * exclusion list.
 *
 * The component owns:
 *  - the search input
 *  - the debounced request to INGREDIENT_SERVICE
 *  - the dropdown of results
 *  - the selected-chips row
 *
 * The parent owns:
 *  - the initial selection (via `initialSelection`)
 *  - whatever happens to the emitted list (via `selectionChange`)
 *
 * A hard cap is enforced on the number of excludable ingredients.
 * The cap applies to *additions* — if the parent supplies an
 * `initialSelection` longer than the cap, it is rendered as-is and
 * not truncated.
 */
@Component({
  selector: 'app-ingredient-autocomplete',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, IconComponent],
  templateUrl: './ingredient-autocomplete.component.html',
  styleUrl: './ingredient-autocomplete.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IngredientAutocompleteComponent {

  private readonly ingredientService = inject(INGREDIENT_SERVICE);
  private readonly destroyRef = inject(DestroyRef);

  // ─── Inputs ──────────────────────────────────────────────────
  /** Label above the search input. */
  readonly label = input<string>('Ingrédients');

  /** Optional hint text under the label. */
  readonly hint = input<string | null>(null);

  /** Placeholder for the search input. */
  readonly placeholder = input<string>('Rechercher un ingrédient…');

  /** Initial selection, set by the parent on drawer open/reset. */
  readonly initialSelection = input<IngredientSummary[]>([]);

  /**
   * Maximum number of ingredients that can be excluded at once.
   * Guards `add()` and the Enter-key path; options are disabled in
   * the template once the limit is reached.
   */
  readonly maxSelection = input<number>(5);

  // ─── Outputs ─────────────────────────────────────────────────
  /** Emits the full selected objects whenever the selection changes. */
  readonly selectionChange = output<IngredientSummary[]>();

  // ─── Internal state ──────────────────────────────────────────
  /** Current search input value. */
  protected readonly searchControl = new FormControl<string>('', { nonNullable: true });

  /** Results of the last search, in the order returned by the service. */
  protected readonly results = signal<IngredientSummary[]>([]);

  /** Whether a search request is in flight. */
  protected readonly isSearching = signal<boolean>(false);

  /** Whether the dropdown is currently shown. */
  protected readonly isDropdownOpen = signal<boolean>(false);

  /** The selected ingredients, ordered by insertion.
   *  Re-seeds whenever the parent changes `initialSelection`. */
  protected readonly selected = linkedSignal<IngredientSummary[]>(() => [
    ...this.initialSelection(),
  ]);

  /** Set of selected ids, for O(1) "is this result already picked" checks. */
  protected readonly selectedIds = computed(
    () => new Set(this.selected().map((i) => i.id)),
  );

  /** Whether the selection has reached `maxSelection`. */
  protected readonly atLimit = computed(
    () => this.selected().length >= this.maxSelection(),
  );

  /** Results filtered to exclude already-selected ingredients. */
  protected readonly availableResults = computed(() => {
    const picked = this.selectedIds();
    return this.results().filter((r) => !picked.has(r.id));
  });

  constructor() {
    // Debounced search on every keystroke.
    this.searchControl.valueChanges
      .pipe(
        debounceTime(SEARCH_DEBOUNCE_MS),
        distinctUntilChanged(),
        switchMap((term) => {
          const trimmed = term.trim();
          if (trimmed.length === 0) {
            this.isSearching.set(false);
            return of<IngredientSummary[]>([]);
          }
          this.isSearching.set(true);
          console.log({term});
          return this.ingredientService
            .searchIngredientsFlat({
              keyword: trimmed,
              moderationStatus: 'APPROVED',
              size: SEARCH_RESULT_LIMIT,
            })
            .pipe(
              catchError((err) => {
                console.error('[IngredientAutocomplete] search failed', err);
                return of<IngredientSummary[]>([]);
              }),
            );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((items) => {
        this.results.set(items);
        this.isSearching.set(false);
        this.isDropdownOpen.set(items.length > 0);
      });
  }

  // ═════════════════════════════════════════════════════════════
  //  Search interaction
  // ═════════════════════════════════════════════════════════════

  protected onInputFocus(): void {
    if (this.results().length > 0) {
      this.isDropdownOpen.set(true);
    }
  }

  protected onInputBlur(): void {
    // Delay the close so a click on a result registers first.
    setTimeout(() => this.isDropdownOpen.set(false), 150);
  }

  protected onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      if (this.atLimit()) return;
      const first = this.availableResults()[0];
      if (first) {
        this.add(first);
      }
    } else if (event.key === 'Escape') {
      this.isDropdownOpen.set(false);
    }
  }

  // ═════════════════════════════════════════════════════════════
  //  Selection
  // ═════════════════════════════════════════════════════════════

  /**
   * Template-facing handler for the dropdown option.
   * Prevents the default mousedown so the input keeps focus long
   * enough to register the selection, then delegates to `add()`
   * which enforces the cap.
   */
  protected tryAdd(ingredient: IngredientSummary, event: Event): void {
    event.preventDefault();
    if (this.atLimit()) return;
    this.add(ingredient);
  }

  protected add(ingredient: IngredientSummary): void {
    if (this.selectedIds().has(ingredient.id)) return;
    if (this.atLimit()) return;

    const next = [...this.selected(), ingredient];
    this.selected.set(next);

    // Clear the search box and close the dropdown.
    this.searchControl.setValue('', { emitEvent: false });
    this.results.set([]);
    this.isDropdownOpen.set(false);

    this.selectionChange.emit(next);
  }

  protected remove(ingredient: IngredientSummary): void {
    const next = this.selected().filter((i) => i.id !== ingredient.id);
    this.selected.set(next);
    this.selectionChange.emit(next);
  }
}
