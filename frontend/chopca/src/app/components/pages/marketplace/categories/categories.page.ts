import {
  ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
import { switchMap, tap } from 'rxjs';

import { IconComponent } from '@components/shared/icon/icon.component';
import { PaginatorComponent } from '@components/shared/paginator/paginator.component';
import { ToastService } from '@components/shared/toast/toast.service';
import {
  CategoryFormComponent,
  CategoryFiltersComponent,
  CategoryTableComponent,
  type CategorySort,
} from '@components/marketplace/category';
import { CATEGORY_SERVICE } from '@app/core/services/marketplace/category.service';
import {
  Category, CategoryRequest, CategorySearchRequest,
} from '@app/core/models/marketplace';
import { CategoryType, ModerationStatus } from '@app/core/models/marketplace/enum-type.model';
import { DataPage } from '@app/core/models/shared';
import { KEYCLOAK_SERVICE } from '@core/services/auth/keycloak.service';
import { ModerationPanelComponent } from '@components/marketplace/moderation';
import { ModerationDataResponse } from '@app/core/models/marketplace/moderation.model';
import {
  DeleteEntityDialogComponent,
} from '@components/shared/delete-entity-dialog/delete-entity-dialog.component';

@Component({
  selector: 'app-categories-page',
  standalone: true,
  imports: [
    IconComponent,
    PaginatorComponent,
    CategoryFormComponent,
    CategoryFiltersComponent,
    CategoryTableComponent,
    ModerationPanelComponent,
  ],
  templateUrl: './categories.page.html',
  styleUrl: './categories.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoriesPageComponent {

  private readonly categoryService = inject(CATEGORY_SERVICE);
  private readonly toast = inject(ToastService);
  private readonly dialog = inject(MatDialog);
  private readonly destroyRef = inject(DestroyRef);
  private readonly roleContext = inject(KEYCLOAK_SERVICE);

  // ─── Filter state ──────────────────────────────────────────
  protected readonly name = signal<string>('');
  protected readonly type = signal<CategoryType | 'ALL'>('ALL');
  protected readonly status = signal<ModerationStatus | 'ALL'>('ALL');
  protected readonly sort = signal<CategorySort>('name-asc');

  // ─── Pagination state ──────────────────────────────────────
  protected readonly page = signal<number>(0);
  protected readonly size = signal<number>(10);

  // ─── Data state ────────────────────────────────────────────
  protected readonly result = signal<DataPage<Category> | null>(null);
  protected readonly loading = signal<boolean>(false);

  // ─── Form state ────────────────────────────────────────────
  protected readonly editing = signal<Category | null>(null);
  protected readonly submitting = signal<boolean>(false);

  /** Aggregate used to trigger a re-fetch whenever any input changes. */
  private readonly query = computed<CategorySearchRequest>(() => ({
      page: this.page(),
      size: this.size(),
      ...(this.name() ? { keyword: this.name() } : {}),
      ...(this.type() !== 'ALL' ? { type: this.type() as CategoryType } : {}),
      ...(this.status() !== 'ALL' ? { status: this.status() as ModerationStatus } : {}),
      ...(this.sort() ? { sort: this.sort() } : {}),
    } as CategorySearchRequest));

  /** Panel renders only when a category is selected AND the user is ADMIN. */
  protected readonly moderableCategory = computed(() =>
    this.roleContext.isAdmin() ? this.editing() : null,
  );

  constructor() {
    // Runs once on init (because query reads signals) and again whenever
    // any of its dependencies change. `effect` is the idiomatic way to
    // react to signal changes that trigger a side effect (HTTP call).
    effect(() => {
      const q = this.query();
      this.load(q);
    });

  }

  // ─── Filter handlers ───────────────────────────────────────
  protected onNameChange(v: string): void { this.name.set(v); this.page.set(0); }
  protected onTypeChange(v: CategoryType | 'ALL'): void { this.type.set(v); this.page.set(0); }
  protected onStatusChange(v: ModerationStatus | 'ALL'): void { this.status.set(v); this.page.set(0); }
  protected onSortChange(v: CategorySort): void { this.sort.set(v); this.page.set(0); }

  // ─── Pagination handlers ───────────────────────────────────
  protected onPageChange(p: number): void { this.page.set(p); }
  protected onSizeChange(s: number): void { this.size.set(s); this.page.set(0); }

  // ─── Form handlers ─────────────────────────────────────────
  protected onEdit(c: Category): void {
    this.editing.set(c);
    document.getElementById('category-form-container')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });

      console.log("moderable", this.roleContext.isAdmin(),this.moderableCategory());
  }

  protected onCancelEdit(): void {
    this.editing.set(null);
  }

  protected onSubmit(req: CategoryRequest): void {
    const current = this.editing();
    this.submitting.set(true);

    const op$ = current
      ? this.categoryService.updateCategory(current.id, req)
      : this.categoryService.createCategory(req);

    op$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (saved) => {
        this.submitting.set(false);
        this.editing.set(saved);
        this.toast.show(
          current ? 'Catégorie mise à jour' : 'Catégorie créée',
          'success',
        );
        this.refresh();
      },
      error: err => {
        this.submitting.set(false);
        this.toast.show(
          current ? 'Échec de la mise à jour' : 'Échec de la création',
          'error',
        );
        console.error(err);
      },
    });
  }

  protected onToggleStatus(c: Category): void {
    const next: ModerationStatus = c.status === 'DISABLED' ? 'APPROVED' : 'DISABLED';
    this.categoryService.updateCategory(c.id, { status: next } as Partial<CategoryRequest> & { status: ModerationStatus })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.toast.show(
            next === 'APPROVED' ? 'Catégorie activée' : 'Catégorie désactivée',
            'success',
          );
          this.refresh();
        },
        error: () => this.toast.show('Échec du changement de statut', 'error'),
      });
  }

  protected onDelete(c: Category): void {
    this.dialog
      .open(DeleteEntityDialogComponent, {
        data: { name: c.name, kind: 'category' },
        autoFocus: 'dialog',
        restoreFocus: true,
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(result => {
        if (!result) return;
        this.categoryService.deleteCategory(c.id)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.toast.show('Catégorie supprimée', 'success');
              this.refresh();
            },
            error: () => this.toast.show('Échec de la suppression', 'error'),
          });
      });
  }

  // ─── CSV stubs ─────────────────────────────────────────────
  protected onImportCsv(): void {
    // TODO: wire to backend — open a file picker, POST multipart, refresh.
    this.toast.show('Import CSV — fonctionnalité à venir', 'info');
  }

  protected onExportCsv(): void {
    // TODO: wire to backend — call export endpoint, trigger download.
    this.toast.show('Export CSV — fonctionnalité à venir', 'info');
  }

  protected onQuickNew(): void {
    this.editing.set(null);
    document.getElementById('category-form-container')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    document.getElementById('cat-name')?.focus?.();
  }

  /** Single load path — used by the effect and by explicit refresh. */
  private load(q: CategorySearchRequest): void {
    this.loading.set(true);
    this.categoryService
      .searchCategories(q)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: page => {
          this.result.set(page);
          this.loading.set(false);
        },
        error: err => {
          this.loading.set(false);
          this.toast.show('Échec du chargement des catégories', 'error');
          console.error(err);
        },
      });
  }

  /** Force a re-fetch with the current query (used after create/update/delete). */
  private refresh(): void {
    this.load(this.query());
  }

  /** Optional: keep the panel's targetStatus in sync with `editing` refetches. */
  protected onModerated(_outcome: ModerationDataResponse | null): void {
    const current = this.editing();
    if (!current) return;
    // Refetch to pick up the new status, then refresh the list.
    this.categoryService.getCategoryById(current.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: fresh => {
          this.editing.set(fresh);
          this.refresh();
        },
        error: () => this.refresh(),
      });
  }
}
