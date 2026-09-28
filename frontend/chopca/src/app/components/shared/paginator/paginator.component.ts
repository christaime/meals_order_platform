import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { IconComponent } from '@components/shared/icon/icon.component';
import { DataPage } from '@app/core/models/shared';

@Component({
  selector: 'app-paginator',
  standalone: true,
  imports: [IconComponent],
  templateUrl: './paginator.component.html',
  styleUrl: './paginator.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaginatorComponent<T> {

  readonly page = input.required<DataPage<T> | null>();
  readonly pageSizeOptions = input<readonly number[]>([10, 20, 50]);
  readonly disabled = input<boolean>(false);

  readonly pageChange = output<number>();
  readonly pageSizeChange = output<number>();

  /** 1-based page number for display. */
  protected readonly displayPage = computed(() => (this.page()?.page ?? 0) + 1);

  /** Window of page numbers around the current one (max 5). */
  protected readonly pages = computed<number[]>(() => {
    const p = this.page();
    if (!p || p.totalPages <= 1) return [];
    const current = p.page;
    const total = p.totalPages;
    const window = 5;
    let start = Math.max(0, current - Math.floor(window / 2));
    let end = Math.min(total, start + window);
    start = Math.max(0, end - window);
    const out: number[] = [];
    for (let i = start; i < end; i++) out.push(i);
    return out;
  });

  protected go(page: number): void {
    if (this.disabled() || !this.page()) return;
    const p = this.page()!;
    if (page < 0 || page >= p.totalPages || page === p.page) return;
    this.pageChange.emit(page);
  }

  protected onSizeChange(event: Event): void {
    const value = Number((event.target as HTMLSelectElement).value);
    if (!Number.isFinite(value)) return;
    this.pageSizeChange.emit(value);
  }
}
