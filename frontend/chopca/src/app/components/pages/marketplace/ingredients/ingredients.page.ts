import {
  ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, signal, input
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';

import { IconComponent } from '@components/shared/icon/icon.component';
import { PaginatorComponent } from '@components/shared';
import { ToastService } from '@components/shared/toast';
import { ModerationPanelComponent } from '@components/marketplace/moderation';
import {
  IngredientFiltersComponent,
  IngredientTableComponent,
} from '@components/marketplace/ingredient';
import {
  IngredientFormComponent
} from '@components/marketplace/ingredient/ingredient-form/ingredient-form.component';

import { INGREDIENT_SERVICE } from '@app/core/services/marketplace/ingredient.service';
import {
  Ingredient, IngredientSearchRequest,
} from '@app/core/models/marketplace';
import { ModerationStatus } from '@app/core/models/marketplace/enum-type.model';
import { ModerationDataResponse } from '@app/core/models/marketplace/moderation.model';
import { RoleContext } from '@app/core/services/auth/role-context.service';
import { DataPage } from '@app/core/models/shared';
import {
  IngredientSort, AllergenFilter,
} from '@components/marketplace/ingredient/ingredient-filters/ingredient-filters.component';
import {
  DeleteEntityDialogComponent,
} from '@components/shared/delete-entity-dialog/delete-entity-dialog.component';


@Component({
  selector: 'app-ingredients-page',
  standalone: true,
  imports: [
    IconComponent,
    PaginatorComponent,
    ModerationPanelComponent,
    IngredientFormComponent,
    IngredientFiltersComponent,
    IngredientTableComponent,
  ],
  templateUrl: './ingredients.page.html',
  styleUrl: './ingredients.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IngredientsPageComponent {

  private readonly ingredientService = inject(INGREDIENT_SERVICE);
  private readonly toast = inject(ToastService);
  private readonly dialog = inject(MatDialog);
  private readonly roleContext = inject(RoleContext);
  private readonly destroyRef = inject(DestroyRef);

  // Filters
  protected readonly name = signal<string>('');
  protected readonly isAllergen = signal<AllergenFilter>('ALL');
  protected readonly moderationStatus = signal<ModerationStatus | 'ALL'>('ALL');
  protected readonly sort = signal<IngredientSort>('name-asc');

  // ─── Route-bound inputs ────────────────────────────────────
  /**
   * From `?name=…`. The route's query param name must be `name`.
   * Nullable — withComponentInputBinding binds after construction.
   */
  readonly initialKeyword = input<string | null>(null, { alias: 'name' });

  // Pagination
  protected readonly page = signal<number>(0);
  protected readonly size = signal<number>(10);

  // Data
  protected readonly result = signal<DataPage<unknown> | null>(null);
  protected readonly loading = signal<boolean>(false);

  // Form
  protected readonly editing = signal<Ingredient | null>(null);

  private readonly query = computed<IngredientSearchRequest>(() => ({
    page: this.page(),
    size: this.size(),
    ...(this.name() ? { keyword: this.name() } : {}),
    ...(this.isAllergen() !== 'ALL' ? { isAllergen: this.isAllergen() === 'YES' } : {}),
    ...(this.moderationStatus() !== 'ALL'
      ? { moderationStatus: this.moderationStatus() as ModerationStatus }
      : {}),
    ...(this.sort() ? { sortBy: this.sort().startsWith('name') ? 'name' : 'moderationStatus',
                        sortDirection: this.sort() === 'name-desc' ? 'DESC' : 'ASC' } : {}),
  } as IngredientSearchRequest));

  /**
   * The ingredient currently open in the form, gated by admin role.
   * Returns null for non-admins so the moderation panel doesn't render.
   */
  protected readonly moderableIngredient = computed<Ingredient | null>(() =>
    this.roleContext.isAdmin() ? this.editing() : null,
  );

  constructor() {
    effect(() => {
      const initial = this.initialKeyword();
      if (initial ) {
        this.name.set(initial);
      }
    }, { allowSignalWrites: true });
    effect(() => this.load(this.query()));
  }

  private load(q: IngredientSearchRequest): void {
    this.loading.set(true);
    this.ingredientService.searchIngredients(q)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: page => {
          this.result.set(page);
          this.loading.set(false);
        },
        error: err => {
          this.loading.set(false);
          this.toast.show('Échec du chargement des ingrédients', 'error');
          console.error(err);
        },
      });
  }

  private refresh(): void { this.load(this.query()); }

  /** The table expects `Ingredient[]`, not `IngredientSummary[]`.
   *  Our search returns summaries, so re-fetch full rows for display.
   *  Simplest path: cast the summaries to Ingredient (they carry the
   *  fields the table reads: id, name, isAllergen, moderationStatus).
   *  If the backend's summary is missing isActive/creator, add those
   *  to IngredientSummary on the backend instead of doing a second call. */
  protected readonly tableRows = computed<readonly Ingredient[]>(() => {
    const page = this.result();
    return (page?.content ?? []) as unknown as readonly Ingredient[];
  });

  // Filter handlers
  protected onNameChange(v: string): void { this.name.set(v); this.page.set(0); }
  protected onIsAllergenChange(v: AllergenFilter): void { this.isAllergen.set(v); this.page.set(0); }
  protected onStatusChange(v: ModerationStatus | 'ALL'): void { this.moderationStatus.set(v); this.page.set(0); }
  protected onSortChange(v: IngredientSort): void { this.sort.set(v); this.page.set(0); }

  // Pagination handlers
  protected onPageChange(p: number): void { this.page.set(p); }
  protected onSizeChange(s: number): void { this.size.set(s); this.page.set(0); }

  // Form handlers
  protected onEdit(ing: Ingredient): void {
    this.editing.set(ing);
    document.getElementById('ingredient-form-container')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  protected onCancelEdit(): void { this.editing.set(null); }

  protected onSaved(saved: Ingredient): void {
    const wasEditing = this.editing() !== null;

    // IMPORTANT: keep the returned entity in `editing`.
    // - For create: `editing` was null; now it holds the persisted
    //   ingredient with a real ID, so the form switches to edit mode
    //   and the moderation panel mounts.
    // - For update: `editing` already held the entity; replace it with
    //   the fresh response (which may have a new `updatedAt`).
    this.editing.set(saved);

    this.toast.show(
      wasEditing ? 'Ingrédient mis à jour' : 'Ingrédient créé',
      'success',
    );

    this.refresh();
  }

  protected onToggleActive(ing: Ingredient): void {
    this.ingredientService
      .updateIngredient(ing.id, { isActive: !ing.isActive } as never)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.toast.show(ing.isActive ? 'Ingrédient désactivé' : 'Ingrédient activé', 'success');
          this.refresh();
        },
        error: () => this.toast.show('Échec du changement de statut', 'error'),
      });
  }

   protected onDelete(ing: Ingredient): void {
     this.dialog
       .open(DeleteEntityDialogComponent, {
         data: { name: ing.name, kind: 'ingredient' },
       })
       .afterClosed()
       .pipe(takeUntilDestroyed(this.destroyRef))
       .subscribe(result => {
         if (!result) return;
         this.ingredientService.deleteIngredient(ing.id)
           .pipe(takeUntilDestroyed(this.destroyRef))
           .subscribe({
             next: () => {
               this.toast.show('Ingrédient supprimé', 'success');
               if (this.editing()?.id === ing.id) this.editing.set(null);
               this.refresh();
             },
             error: () => this.toast.show('Échec de la suppression', 'error'),
           });
       });
   }

  protected onModerated(_outcome: ModerationDataResponse | null): void {
    const current = this.editing();
    if (!current) return;
    this.ingredientService.getIngredientById(current.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: fresh => { this.editing.set(fresh); this.refresh(); },
        error: () => this.refresh(),
      });
  }

  protected onQuickNew(): void {
    this.editing.set(null);
    document.getElementById('ingredient-form-container')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  protected onImportCsv(): void {
    // TODO: wire to backend
    this.toast.show('Import CSV — fonctionnalité à venir', 'info');
  }

  protected onExportCsv(): void {
    // TODO: wire to backend
    this.toast.show('Export CSV — fonctionnalité à venir', 'info');
  }
}
