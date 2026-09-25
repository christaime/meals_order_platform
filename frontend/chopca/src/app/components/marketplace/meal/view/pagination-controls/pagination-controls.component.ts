import {
  Component,
  ChangeDetectionStrategy,
  model,
  input,
  output,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '@components/shared/icon/icon.component';

/**
 * PaginationControls — Navigation bar for paginated meal listings.
 *
 * Responsibilities:
 * - Handle page navigation via `currentPage` model binding.
 * - Calculate total pages dynamically from `totalItems` and `pageSize`.
 * - Emit `pageChange` outputs on navigation interactions.
 */
@Component({
  selector: 'app-pagination-controls',
  standalone: true,
  imports: [CommonModule, IconComponent],
  templateUrl: './pagination-controls.component.html',
  styleUrl: './pagination-controls.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaginationControlsComponent {
  // ─── Signals ──────────────────────────────────────────────────────
  /** Currently active page index (1-based). */
  readonly currentPage = model<number>(1);

  /** Total number of available items. */
  readonly totalItems = input<number>(0);

  /** Number of items rendered per page. */
  readonly pageSize = input<number>(12);

  /** Emitted when page is changed. */
  readonly pageChange = output<number>();

  // ─── Computed Properties ──────────────────────────────────────────
  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.totalItems() / this.pageSize()))
  );

  readonly pages = computed(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    const pageList: (number | '...')[] = [];

    if (total <= 7) {
      for (let i = 1; i <= total; i++) pageList.push(i);
    } else {
      pageList.push(1);
      if (current > 3) pageList.push('...');

      const start = Math.max(2, current - 1);
      const end = Math.min(total - 1, current + 1);
      for (let i = start; i <= end; i++) pageList.push(i);

      if (current < total - 2) pageList.push('...');
      pageList.push(total);
    }

    return pageList;
  });

  // ─── Actions ──────────────────────────────────────────────────────
  goToPage(page: number | '...'): void {
    if (typeof page === 'number' && page >= 1 && page <= this.totalPages() && page !== this.currentPage()) {
      this.currentPage.set(page);
      this.pageChange.emit(page);
    }
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.goToPage(this.currentPage() + 1);
    }
  }

  previousPage(): void {
    if (this.currentPage() > 1) {
      this.goToPage(this.currentPage() - 1);
    }
  }
}
