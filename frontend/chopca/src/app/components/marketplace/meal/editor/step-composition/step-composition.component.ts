import {
  Component,
  ChangeDetectionStrategy,
  ElementRef,
  ViewChild,
  input,
  inject,
  signal,
  computed,
  OnInit,
  DestroyRef,
  HostListener,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { MatSliderModule } from '@angular/material/slider';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

import { IconComponent } from '@components/shared/icon/icon.component';
import { NewIngredientDialogComponent } from '../../../ingredient/dialogs/new-ingredient-dialog/new-ingredient-dialog.component';

import { INGREDIENT_SERVICE } from '@app/core/services/marketplace/ingredient.service';
import {
  Ingredient,
  IngredientSummary,
  IngredientSearchRequest,
} from '@app/core/models/marketplace';

/**
 * Step 2 — Composition.
 *
 * Fields:
 * - prepTimeMinutes (Material slider)
 * - ingredientIds (chip input + custom autocomplete + create/edit dialog)
 *
 * Ingredient resolution:
 * - When `initialIngredients` is provided (editing an existing meal, whose
 *   MealResponse already carries the full ingredient summaries), the
 *   component resolves the form's ingredient ids against that list —
 *   no backend call.
 * - When it's null (create mode, or a bare mount), the component falls
 *   back to fetching. In practice this path is rarely hit because the
 *   user adds ingredients one at a time via `addIngredient()`.
 */
@Component({
  selector: 'app-step-composition',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatSliderModule,
    IconComponent,
  ],
  templateUrl: './step-composition.component.html',
  styleUrl: './step-composition.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StepCompositionComponent implements OnInit {

  private readonly ingredientService = inject(INGREDIENT_SERVICE);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild('ingredientInput')
  private ingredientInputRef?: ElementRef<HTMLInputElement>;

  readonly form = input.required<FormGroup>();

  readonly initialIngredients = input<IngredientSummary[] | null>(null);

  // ─── Ingredient state ─────────────────────────────────────
  readonly ingredientFilter = signal<string>('');
  private readonly searchResults = signal<IngredientSummary[]>([]);
  readonly selectedIngredients = signal<IngredientSummary[]>([]);

  readonly highlightIndex = signal<number>(-1);
  readonly dropdownOpen = signal<boolean>(false);

  private readonly ingredientCache = signal<Map<string, IngredientSummary>>(new Map());

  protected readonly filteredResults = computed(() => {
    const selected = new Set(this.selectedIngredients().map(i => i.id));
    return this.searchResults().filter(i => !selected.has(i.id));
  });

  protected readonly showDropdown = computed(
    () => this.dropdownOpen() && this.filteredResults().length > 0,
  );

  private searchTimer?: ReturnType<typeof setTimeout>;

  // ─── Accessors ────────────────────────────────────────────
  protected get prepTimeMinutes(): FormControl<number | null> {
    return this.form().controls['prepTimeMinutes'] as FormControl<number | null>;
  }
  protected get ingredientIds(): FormControl<string[]> {
    return this.form().controls['ingredientIds'] as FormControl<string[]>;
  }

  private readonly lastSearchedTerm = signal<string>('');

  // ─── Lifecycle ────────────────────────────────────────────

  ngOnInit(): void {
    const provided = this.initialIngredients();
    if (provided && provided.length > 0) {
      const next = new Map(this.ingredientCache());
      for (const i of provided) next.set(i.id, i);
      this.ingredientCache.set(next);
    }

    this.ingredientIds.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(ids => this.syncSelected(ids ?? []));

    this.syncSelected(this.ingredientIds.value ?? []);
  }

  protected formatPrepTime(minutes: number | null): string {
    if (minutes == null || minutes === 0) return 'Non défini';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m} min`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}min`;
  }

  // ─── Ingredients — selection sync ─────────────────────────

  private syncSelected(ids: string[]): void {
    if (!ids.length) {
      this.selectedIngredients.set([]);
      return;
    }

    const cache = this.ingredientCache();
    const missing = ids.filter(id => !cache.has(id));

    if (missing.length) {
      if (this.initialIngredients() !== null) {
        console.warn(
          '[StepComposition] ingredient ids not in the supplied list, skipping:',
          missing,
        );
        this.updateSelectedFromCache(ids);
        return;
      }

      this.ingredientService
        .searchIngredients({} as IngredientSearchRequest)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (page) => {
            const next = new Map(cache);
            for (const i of page.content) next.set(i.id, i);
            this.ingredientCache.set(next);
            this.updateSelectedFromCache(ids);
          },
          error: () => this.updateSelectedFromCache(ids),
        });
    } else {
      this.updateSelectedFromCache(ids);
    }
  }

  private updateSelectedFromCache(ids: string[]): void {
    const cache = this.ingredientCache();
    const list: IngredientSummary[] = [];
    for (const id of ids) {
      const ing = cache.get(id);
      if (ing) {
        list.push(ing);
      } else {
        console.warn('[StepComposition] unresolved ingredient id', id);
      }
    }
    this.selectedIngredients.set(list);
  }

  // ─── Ingredients — search ─────────────────────────────────

  protected onIngredientInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.ingredientFilter.set(value);
    this.highlightIndex.set(-1);

    if (value.trim().length < 2) {
      this.searchResults.set([]);
      this.dropdownOpen.set(false);
      return;
    }

    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.performSearch(value.trim()), 250);
  }

  private performSearch(keyword: string): void {
    this.ingredientService
      .searchIngredients({ keyword, size: 10 } as IngredientSearchRequest)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (page) => {
          this.searchResults.set(page.content);
          this.lastSearchedTerm.set(keyword);
          this.dropdownOpen.set(true);
          this.highlightIndex.set(page.content.length > 0 ? 0 : -1);
        },
        error: (err) => {
          console.error('[StepComposition] search error', err);
          this.searchResults.set([]);
          this.lastSearchedTerm.set(keyword);
          this.dropdownOpen.set(false);
        },
      });
  }

  // ─── Ingredients — keyboard navigation ────────────────────

  protected onInputKeydown(event: KeyboardEvent): void {
    const results = this.filteredResults();

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!this.dropdownOpen()) {
        this.dropdownOpen.set(true);
        return;
      }
      this.highlightIndex.update(i => Math.min(i + 1, results.length - 1));
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.highlightIndex.update(i => Math.max(i - 1, 0));
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();

      if (this.dropdownOpen() && this.highlightIndex() >= 0 && results[this.highlightIndex()]) {
        this.addIngredient(results[this.highlightIndex()]);
        return;
      }

      if (this.showCreateHint()) {
        this.openCreateIngredientDialog();
        return;
      }
    }

    if (event.key === 'Escape') {
      this.dropdownOpen.set(false);
      this.highlightIndex.set(-1);
    }
  }

  // ─── Ingredients — add / remove ───────────────────────────

  addIngredient(ingredient: IngredientSummary): void {
    if (this.selectedIngredients().some(i => i.id === ingredient.id)) return;

    const cache = new Map(this.ingredientCache());
    cache.set(ingredient.id, ingredient);
    this.ingredientCache.set(cache);

    this.ingredientIds.setValue([...this.ingredientIds.value, ingredient.id]);
    this.ingredientIds.markAsTouched();
    this.clearFilter();
  }

  removeIngredient(ingredient: IngredientSummary): void {
    const next = this.ingredientIds.value.filter(id => id !== ingredient.id);
    this.ingredientIds.setValue(next);
    this.ingredientIds.markAsTouched();
  }

  private clearFilter(): void {
    this.ingredientFilter.set('');
    this.searchResults.set([]);
    this.dropdownOpen.set(false);
    this.highlightIndex.set(-1);
    this.ingredientInputRef?.nativeElement.focus();
  }

  // ─── Ingredients — edit (only when moderationStatus is PENDING) ───

  /**
   * Whether the given ingredient can be edited from the chip.
   *
   * The rule: only ingredients whose `moderationStatus` is `'PENDING'`.
   * A missing `moderationStatus` blocks the edit — a chip with no status
   * can't be trusted to be editable.
   */
  protected isEditable(ing: IngredientSummary): boolean {
    return ing.moderationStatus === 'PENDING';
  }

  editIngredient(ing: IngredientSummary): void {
    if (!this.isEditable(ing)) return;

    const ref = this.dialog.open(NewIngredientDialogComponent, {
      width: '480px',
      maxHeight: '90vh',
      data: { ...ing },
    });

    ref.afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((updated: Ingredient | undefined) => {
        if (!updated) return;

        // Replace the cached object so the chip re-renders with the new name.
        this.ingredientCache.update((m) => {
          const next = new Map(m);
          next.set(updated.id, {
            id: updated.id,
            name: updated.name,
            isAllergen: updated.isAllergen,
            moderationStatus: updated.moderationStatus,
          } as IngredientSummary);
          return next;
        });

        // Re-resolve the chips from the cache.
        this.updateSelectedFromCache(this.ingredientIds.value);

        this.snackBar.open(`« ${updated.name} » mis à jour`, 'OK', { duration: 3000 });
      });
  }

  // ─── Create dialog ────────────────────────────────────────

  openCreateIngredientDialog(): void {
    const name = this.ingredientFilter().trim();
    const ref = this.dialog.open(NewIngredientDialogComponent, {
      width: '480px',
      maxHeight: '90vh',
      data: { name },
    });

    ref.afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((created: Ingredient | undefined) => {
        if (!created) return;
        this.addIngredient({
          id: created.id,
          name: created.name,
          isAllergen: created.isAllergen,
          moderationStatus: created.moderationStatus,
        } as IngredientSummary);
        this.snackBar.open(`« ${created.name} » ajouté`, 'OK', { duration: 3000 });
      });
  }

  // ─── Dropdown close on outside click ──────────────────────

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    if (!this.dropdownOpen()) return;
    const host = (event.target as HTMLElement).closest('app-step-composition');
    if (!host) this.dropdownOpen.set(false);
  }

  // ─── Errors ───────────────────────────────────────────────

  protected prepTimeError(): string | null {
    const c = this.prepTimeMinutes;
    if (!c.touched || !c.errors) return null;
    if (c.errors['required']) return 'Le temps de préparation est requis';
    return null;
  }

  protected ingredientError(): string | null {
    const c = this.ingredientIds;
    if (!c.touched) return null;
    return (c.value ?? []).length === 0
      ? 'Ajoutez au moins un ingrédient'
      : null;
  }

  protected showCreateHint(): boolean {
    const term = this.ingredientFilter().trim();
    if (term.length < 2) return false;
    if (this.lastSearchedTerm() !== term) return false;
    return this.searchResults().length === 0;
  }
}
