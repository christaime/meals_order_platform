import {
  Component,
  ChangeDetectionStrategy,
  model,
  input,
  output,
} from '@angular/core';
import { CommonModule } from '@angular/common';

export interface SubCategoryChip {
  id: string;
  name: string;
  count?: number;
}

/**
 * SubCategoryFilterChips — Secondary filter tags for dish types and quick modifiers.
 *
 * Responsibilities:
 * - Render secondary filter tags (e.g., "Plats de résistance", "Entrées", "< 3000 FCFA").
 * - Support two-way signal model binding for `selectedSubCategoryId`.
 * - Provide compact, subtle tag styling distinct from main category chips.
 */
@Component({
  selector: 'app-sub-category-filter-chips',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sub-category-filter-chips.component.html',
  styleUrl: './sub-category-filter-chips.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SubCategoryFilterChipsComponent {
  // ─── Signals ──────────────────────────────────────────────────────
  /** Currently selected sub-category ID. Defaults to 'all'. */
  readonly selectedSubCategoryId = model<string>('all');

  /** List of sub-categories or quick modifiers. */
  readonly subCategories = input<SubCategoryChip[]>([
    { id: 'all', name: 'Tous les types' },
    { id: 'plat-principal', name: 'Plats de résistance', count: 42 },
    { id: 'sauce-seule', name: 'Sauces seules', count: 18 },
    { id: 'express', name: 'Prépa < 30 min', count: 15 },
    { id: 'eco', name: '< 3000 FCFA', count: 24 },
  ]);

  /** Emitted when a sub-category filter is clicked. */
  readonly subCategoryChange = output<SubCategoryChip>();

  // ─── Actions ──────────────────────────────────────────────────────
  selectSubCategory(item: SubCategoryChip): void {
    this.selectedSubCategoryId.set(item.id);
    this.subCategoryChange.emit(item);
  }
}
