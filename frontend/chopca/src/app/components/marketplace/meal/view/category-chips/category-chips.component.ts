import {
  Component,
  ChangeDetectionStrategy,
  model,
  input,
  output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '@components/shared/icon/icon.component';

export interface CategoryChip {
  id: string;
  name: string;
  icon?: string;
}

/**
 * CategoryChips — Horizontal scrollable chip selector for main cuisine categories.
 *
 * Responsibilities:
 * - Render main cuisine filter chips ("Tous les plats", "Street Food", "Grillades", etc.).
 * - Support two-way signal model binding for `selectedCategoryId`.
 * - Provide smooth horizontal scrolling behavior across devices.
 */
@Component({
  selector: 'app-category-chips',
  standalone: true,
  imports: [CommonModule, IconComponent],
  templateUrl: './category-chips.component.html',
  styleUrl: './category-chips.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryChipsComponent {
  // ─── Signals ──────────────────────────────────────────────────────
  /** Currently selected category ID (Two-way model signal). Defaults to 'all'. */
  readonly selectedCategoryId = model<string>('all');

  /** List of cuisine categories. Defaults to core marketplace cuisines if omitted. */
  readonly categories = input<CategoryChip[]>([
    { id: 'all', name: 'Tous les plats', icon: 'restaurant_menu' },
    { id: 'traditionnel', name: 'Traditionnel', icon: 'soup_kitchen' },
    { id: 'grillades', name: 'Grillades', icon: 'local_fire_department' },
    { id: 'street-food', name: 'Street Food', icon: 'fastfood' },
    { id: 'sauces', name: 'Sauces & Accompagnements', icon: 'ramen_dining' },
    { id: 'boissons', name: 'Boissons Artisanales', icon: 'local_bar' },
  ]);

  /** Emitted when a new category is selected. */
  readonly categoryChange = output<CategoryChip>();

  // ─── Actions ──────────────────────────────────────────────────────
  selectCategory(category: CategoryChip): void {
    this.selectedCategoryId.set(category.id);
    this.categoryChange.emit(category);
  }
}
