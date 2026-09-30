import {
  ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { IconComponent } from '@components/shared/icon/icon.component';
import { PaginatorComponent } from '@components/shared/paginator/paginator.component';
import { ToastService } from '@components/shared/toast';
import {
  VendorFiltersComponent,
  VendorSort,
  VendorStatusFilter,
} from '@components/marketplace/vendor/vendor-filters/vendor-filters.component';
import { VendorTableComponent } from '@components/marketplace/vendor/vendor-table/vendor-table.component';
import {
  VendorModerationPanelComponent,
} from '@components/marketplace/vendor/vendor-moderation-panel/vendor-moderation-panel.component';

import { VENDOR_SERVICE } from '@app/core/services/marketplace/vendor.service';
import { Vendor, VendorSearchRequest } from '@app/core/models/marketplace';
import { VendorStatus } from '@app/core/models/marketplace/enum-type.model';
import { DataPage } from '@app/core/models/shared';

@Component({
  selector: 'app-vendors-page',
  standalone: true,
  imports: [
    IconComponent,
    PaginatorComponent,
    VendorFiltersComponent,
    VendorTableComponent,
    VendorModerationPanelComponent,
  ],
  templateUrl: './vendors.page.html',
  styleUrl: './vendors.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VendorsPageComponent {

  private readonly vendorService = inject(VENDOR_SERVICE);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  // ─── Filters ──────────────────────────────────────────────
  protected readonly keyword = signal<string>('');
  protected readonly status = signal<VendorStatusFilter>('ALL');
  protected readonly sort = signal<VendorSort>('name-asc');

  // ─── Pagination ───────────────────────────────────────────
  protected readonly page = signal<number>(0);
  protected readonly size = signal<number>(10);

  // ─── Data ─────────────────────────────────────────────────
  protected readonly result = signal<DataPage<Vendor> | null>(null);
  protected readonly loading = signal<boolean>(false);

  // ─── Moderation selection ─────────────────────────────────
  protected readonly editing = signal<Vendor | null>(null);

  // ─── Query ────────────────────────────────────────────────
  private readonly query = computed<VendorSearchRequest>(() => {
    const sort = this.sort();
    let sortBy = 'businessName';
    let sortDirection: 'ASC' | 'DESC' = 'ASC';
    if (sort === 'name-desc')         { sortBy = 'businessName'; sortDirection = 'DESC'; }
    else if (sort === 'rating-desc')  { sortBy = 'ratingAvg';    sortDirection = 'DESC'; }
    else if (sort === 'recent')       { sortBy = 'createdAt';    sortDirection = 'DESC'; }

    return {
      page: this.page(),
      size: this.size(),
      sortBy,
      sortDirection,
      ...(this.keyword() ? { keyword: this.keyword() } : {}),
      ...(this.status() !== 'ALL'
        ? { status: this.status() as VendorStatus }
        : {}),
    } as VendorSearchRequest;
  });

  constructor() {
    effect(() => this.load(this.query()));
  }

  private load(q: VendorSearchRequest): void {
    this.loading.set(true);
    this.vendorService.searchVendors(q)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: page => { this.result.set(page); this.loading.set(false); },
        error: err => {
          this.loading.set(false);
          this.toast.show('Échec du chargement des vendeurs', 'error');
          console.error(err);
        },
      });
  }

  private refresh(): void {
    this.load(this.query());
  }

  // ─── Filter handlers ──────────────────────────────────────
  protected onKeywordChange(v: string): void { this.keyword.set(v); this.page.set(0); }
  protected onStatusChange(v: VendorStatusFilter): void { this.status.set(v); this.page.set(0); }
  protected onSortChange(v: VendorSort): void { this.sort.set(v); this.page.set(0); }
  protected onPageChange(p: number): void { this.page.set(p); }
  protected onSizeChange(s: number): void { this.size.set(s); this.page.set(0); }

  // ─── Row selection ────────────────────────────────────────
  protected onSelectForModeration(v: Vendor): void {
    this.editing.set(v);
  }

  // ─── Moderation outcome ───────────────────────────────────
  protected onModerated(updated: Vendor): void {
    // Replace the editing vendor with the fresh state so the panel's
    // currentStatus is correct immediately, then refresh the list.
    this.editing.set(updated);
    this.refresh();
  }
}
