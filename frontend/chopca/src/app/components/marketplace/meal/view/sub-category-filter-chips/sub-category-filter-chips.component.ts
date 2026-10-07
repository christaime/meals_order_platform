import {
  Component,
  ChangeDetectionStrategy,
  input,
  model,
  output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '@components/shared';
/**
 * The origin of a sub-category chip.
 *
 * - ALL       → the "Tous les types" chip (no filter applied)
 * - CUISINE   → a category of type CUISINE
 * - DISH_TYPE → a category of type DISH_TYPE
 * - SHORTCUT  → a derived chip (express prep time, economy price)
 */
export type SubCategoryKind = 'ALL' | 'CUISINE' | 'DISH_TYPE' | 'SHORTCUT';

export interface SubCategoryChip {
  readonly id: string;
  readonly name: string;
  readonly iconUrl?: string;
  readonly count?: number;
  readonly kind: SubCategoryKind;
}

@Component({
  selector: 'app-sub-category-filter-chips',
  standalone: true,
  imports: [CommonModule, IconComponent],
  templateUrl: './sub-category-filter-chips.component.html',
  styleUrl: './sub-category-filter-chips.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SubCategoryFilterChipsComponent {

  /** Currently selected chip ids. Empty array means "all". */
  readonly selectedSubCategoryIds = model<string[]>([]);

  /** Available chips, ordered by the parent. */
  readonly subCategories = input<SubCategoryChip[]>([]);

  /** Emits the full list of selected chips on every toggle. */
  readonly subCategoryChange = output<SubCategoryChip[]>();

  protected isSelected(id: string): boolean {
    return (this.selectedSubCategoryIds().length == 0 && id == 'all' )|| this.selectedSubCategoryIds().includes(id);
  }

  protected selectSubCategory(item: SubCategoryChip): void {
    // "all" is exclusive: selecting it clears everything else.
    if (item.kind === 'ALL') {
      this.selectedSubCategoryIds.set([]);
      this.subCategoryChange.emit([]);
      return;
    }

    const current = this.selectedSubCategoryIds();
    const next = current.includes(item.id)
      ? current.filter((id) => id !== item.id)   // toggle off
      : [...current, item.id];                    // toggle on

    this.selectedSubCategoryIds.set(next);

    const selectedChips = this.subCategories().filter((c) => next.includes(c.id));
    this.subCategoryChange.emit(selectedChips);
  }
}
