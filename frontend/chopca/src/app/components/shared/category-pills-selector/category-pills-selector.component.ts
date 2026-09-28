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
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { IconComponent } from '@components/shared/icon/icon.component';
import { FormErrorComponent } from '@components/shared/form-error/form-error.component';
import { CATEGORY_SERVICE } from '@app/core/services/marketplace/category.service';
import { Category, CategoryType } from '@app/core/models/marketplace';

/**
 * Multi-select chip group for categories of a given type.
 *
 * Fetches categories of the specified `categoryType` from the API and
 * renders them as toggleable pills. The selection is bound to a
 * FormControl holding an array of category IDs.
 *
 * This is the generic version — the caller decides which type of
 * category to load. Use it for:
 * - CUISINE (vendor specialties, meal cuisine classification)
 * - DISH_TYPE (meal dish-type classification)
 * - Future types (DIETARY, OCCASION, etc.)
 *
 * Features:
 * - Loads categories filtered by type from the API
 * - Click to toggle individual pills
 * - Enforces a maximum selection count (`maxSelection`)
 * - Shows the selection count in the label row
 * - Loading skeleton while the API request is in flight
 * - Error state if the fetch fails
 *
 * Usage (multi-select with max 3 cuisines):
 *   <app-category-pills-selector
 *     categoryType="CUISINE"
 *     [control]="specialtiesControl"
 *     [maxSelection]="3"
 *     [error]="specialtiesError()" />
 *
 * Usage (single-select for dish type):
 *   <app-category-pills-selector
 *     categoryType="DISH_TYPE"
 *     [control]="dishTypeControl"
 *     [maxSelection]="1"
 *     label="Type de plat" />
 */
@Component({
  selector: 'app-category-pills-selector',
  standalone: true,
  imports: [ReactiveFormsModule, IconComponent, FormErrorComponent],
  templateUrl: './category-pills-selector.component.html',
  styleUrl: './category-pills-selector.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryPillsSelectorComponent implements OnInit {

  private readonly categoryService = inject(CATEGORY_SERVICE);
  private readonly destroyRef = inject(DestroyRef);

  // ─── Required configuration ───────────────────────────────
  /** The type of categories to load and display. */
  readonly categoryType = input.required<CategoryType>();

  /** The FormControl holding an array of selected category IDs. */
  readonly control = input.required<FormControl<string[]>>();

  // ─── Optional configuration ───────────────────────────────
  /** Optional label above the pills. */
  readonly label = input<string>('Catégories');

  /** Optional hint line under the label. */
  readonly hint = input<string | null>(null);

  /** Maximum number of pills that can be selected. */
  readonly maxSelection = input<number>(3);

  /** Minimum number of pills that must be selected. */
  readonly minSelection = input<number>(1);

  /** Optional error message from the parent. */
  readonly error = input<string | null>(null);

  /** Optional empty-state message when the API returns no items. */
  readonly emptyMessage = input<string>('Aucune option disponible.');

  // ─── Outputs ──────────────────────────────────────────────
  /** Emits when the selection changes. */
  readonly selectionChange = output<string[]>();
  /**
   * Emits the full selected `Category` objects whenever the
   * selection changes. Convenient for consumers that need labels
   * (e.g. a live preview panel) without a second lookup.
   */
  readonly categoriesSelected = output<Category[]>();

  // ─── Internal state ───────────────────────────────────────
  protected readonly loading = signal<boolean>(true);
  protected readonly fetchError = signal<string | null>(null);
  protected readonly categories = signal<Category[]>([]);
  protected readonly selectedIds = signal<string[]>([]);

  // ─── Derived ──────────────────────────────────────────────
  protected readonly selectedCount = computed(() => this.selectedIds().length);
  protected readonly atLimit = computed(
    () => this.selectedCount() >= this.maxSelection()
  );
  protected readonly isSingleSelect = computed(() => this.maxSelection() === 1);

  protected readonly displayedError = computed(() =>
    this.error() ?? this.fetchError()
  );

  /** Whether the initial selection is valid enough to show the counter. */
  protected readonly showCounter = computed(() => this.maxSelection() > 1);

  // ─── Lifecycle ────────────────────────────────────────────

  ngOnInit(): void {
    this.selectedIds.set(this.control().value ?? []);

    this.control().valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value: string[] | null) => {
        this.selectedIds.set(value ?? []);
      });

    this.categoryService.searchCategories({
      type: this.categoryType(),
      size: 100,
      moderationStatus: 'APPROVED',
      sortBy: 'name',
      sortDirection: 'ASC',
    }).subscribe({
      next: (page) => {
        // Unwrap the DataPage
        this.categories.set(page.content);
        this.loading.set(false);
        this.categoriesSelected.emit(this.resolveSelected(this.selectedIds()));
      },
      error: (err) => {
        this.fetchError.set('Impossible de charger les catégories.');
        this.loading.set(false);
        console.error('[CategoryPillsSelector] fetch error', err);
      },
    });
  }

  // ─── Actions ──────────────────────────────────────────────

  protected toggle(category: Category): void {
    const current = this.selectedIds();
    const isSelected = current.includes(category.id);

    let next: string[];

    if (isSelected) {
      // Deselect
      next = current.filter(id => id !== category.id);
    } else if (this.isSingleSelect()) {
      // Single-select mode: replace
      next = [category.id];
    } else {
      // Multi-select: respect the max
      if (current.length >= this.maxSelection()) return;
      next = [...current, category.id];
    }

    this.selectedIds.set(next);
    this.control().setValue(next);
    this.control().markAsTouched();
    this.selectionChange.emit(next);
    this.categoriesSelected.emit(this.resolveSelected(next));
  }

  protected isSelected(category: Category): boolean {
    return this.selectedIds().includes(category.id);
  }

  /**
   * Maps a list of selected category IDs to their full `Category`
   * objects, preserving the order of the source `categories` list.
   * IDs that no longer match any category are silently dropped.
   */
  private resolveSelected(ids: string[]): Category[] {
    const all = this.categories();
    if (ids.length === 0) return [];
    const idSet = new Set(ids);
    return all.filter(c => idSet.has(c.id));
  }
}
