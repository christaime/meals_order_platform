import {
  Component,
  ChangeDetectionStrategy,
  input,
  inject,
  signal,
  computed,
  OnInit,
  DestroyRef,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import {MatSliderModule} from '@angular/material/slider';
import { NewIngredientDialogComponent } from '../../../ingredient/dialogs/new-ingredient-dialog/new-ingredient-dialog.component';

import { INGREDIENT_SERVICE } from '@app/core/services/marketplace/ingredient.service';
import {
  Ingredient,
  IngredientSummary,
  IngredientSearchRequest,
} from '@app/core/models/marketplace';

interface PrepTimePreset {
  readonly label: string;
  readonly minutes: number;
}

/**
 * Step 2 — Composition.
 *
 * Fields:
 * - prepTimeMinutes (select from presets)
 * - ingredientIds (chips + autocomplete + create dialog)
 */
@Component({
  selector: 'app-step-composition',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatChipsModule,
    MatAutocompleteModule,
    MatIconModule,
    MatButtonModule,
    MatSelectModule,
    MatSliderModule
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

  readonly form = input.required<FormGroup>();

  // ─── Ingredients ──────────────────────────────────────────
  readonly ingredientFilter = signal<string>('');
  private readonly searchResults = signal<IngredientSummary[]>([]);
  private readonly searchLoading = signal<boolean>(false);

  readonly selectedIngredients = signal<IngredientSummary[]>([]);
  private readonly ingredientCache = signal<Map<string, IngredientSummary>>(new Map());

  protected readonly filteredResults = computed(() => {
    const selected = new Set(this.selectedIngredients().map(i => i.id));
    return this.searchResults().filter(i => !selected.has(i.id));
  });

  private searchTimer?: ReturnType<typeof setTimeout>;

  // ─── Accessors ────────────────────────────────────────────
  protected get prepTimeMinutes(): FormControl<number | null> {
    return this.form().controls['prepTimeMinutes'] as FormControl<number | null>;
  }
  protected get ingredientIds(): FormControl<string[]> {
    return this.form().controls['ingredientIds'] as FormControl<string[]>;
  }

  // ─── Lifecycle ────────────────────────────────────────────

  ngOnInit(): void {
    // Sync chips when ingredient IDs change (e.g. edit-mode patch)
    this.ingredientIds.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(ids => this.syncSelected(ids ?? []));

    // Initial seed
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
  // ─── Ingredients ──────────────────────────────────────────

  private syncSelected(ids: string[]): void {
    if (!ids.length) {
      this.selectedIngredients.set([]);
      return;
    }

    const cache = this.ingredientCache();
    const missing = ids.filter(id => !cache.has(id));

    if (missing.length) {
      // Prefetch missing summaries
      this.ingredientService
        .searchIngredients({} as IngredientSearchRequest)   // adjust if you have a getByIds
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
    const list = ids.map(id => cache.get(id)).filter((i): i is IngredientSummary => !!i);
    this.selectedIngredients.set(list);
  }

  onIngredientFilterInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.ingredientFilter.set(value);

    if (value.trim().length < 2) {
      this.searchResults.set([]);
      return;
    }

    clearTimeout(this.searchTimer);
    this.searchLoading.set(true);
    this.searchTimer = setTimeout(() => this.performSearch(value.trim()), 250);
  }

  private performSearch(keyword: string): void {
    this.ingredientService
      .searchIngredients({ keyword, size: 10 } as IngredientSearchRequest)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (page) => {
          this.searchResults.set(page.content);
          this.searchLoading.set(false);
        },
        error: (err) => {
          console.error('[StepComposition] search error', err);
          this.searchResults.set([]);
          this.searchLoading.set(false);
        },
      });
  }

  addIngredient(ingredient: IngredientSummary): void {
    if (this.selectedIngredients().some(i => i.id === ingredient.id)) return;

    const cache = new Map(this.ingredientCache());
    cache.set(ingredient.id, ingredient);
    this.ingredientCache.set(cache);

    this.ingredientIds.setValue([...this.ingredientIds.value, ingredient.id]);
    this.ingredientIds.markAsTouched();
    this.ingredientFilter.set('');
    this.searchResults.set([]);
  }

  removeIngredient(ingredient: IngredientSummary): void {
    const next = this.ingredientIds.value.filter(id => id !== ingredient.id);
    this.ingredientIds.setValue(next);
    this.ingredientIds.markAsTouched();
  }

  openCreateIngredientDialog(): void {
    const name = this.ingredientFilter().trim();
    const ref = this.dialog.open(NewIngredientDialogComponent, {
      width: '480px',
      maxHeight: '90vh',
      data: { initialName: name },
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
    return this.ingredientFilter().trim().length >= 2;
  }
}
