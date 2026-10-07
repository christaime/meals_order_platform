import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { map } from 'rxjs/operators';

import { VendorDirectoryViewComponent, DirectoryFilterState , DEFAULT_VENDOR_FILTER} from '@components/marketplace/vendor/vendor-directory-view/vendor-directory-view.component';

import { VENDOR_SERVICE } from '@app/core/services/marketplace/vendor.service';
import { ToastService } from '@components/shared/toast';
import { VendorSummary, VendorSearchRequest, LocationSummary } from '@app/core/models/marketplace';
import { DataPage } from '@app/core/models/shared';

const DEFAULT_PAGE_SIZE = 9;

@Component({
  selector: 'app-vendor-directory-page',
  standalone: true,
  imports: [VendorDirectoryViewComponent],
  template: `
    <app-vendor-directory-view
      [vendors]="result()?.content ?? null"
      [isLoading]="loading()"
      [totalVendors]="result()?.totalElements ?? 0"
      [pageSize]="pageSize"
      (selectVendor)="onSelectVendor($event)"
      (filterChange)="onFilterChange($event)" />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VendorDirectoryPageComponent {

  private readonly vendorService = inject(VENDOR_SERVICE);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly pageSize = DEFAULT_PAGE_SIZE;

  // ─── Filter state (mirrored from the view) ────────────────
  private readonly query    = signal<string | undefined>('');
  private readonly state = signal<DirectoryFilterState>(DEFAULT_VENDOR_FILTER);
  /** The view is 1-indexed; the backend is 0-indexed. */
  private readonly page     = signal<number>(1);

  // ─── Data ─────────────────────────────────────────────────
  protected readonly result  = signal<DataPage<VendorSummary> | null>(null);
  protected readonly loading = signal<boolean>(false);

  // ─── Request ──────────────────────────────────────────────
  private readonly request = computed<VendorSearchRequest>(() => ({
    page: this.page() - 1,
    size: this.pageSize,
    sortBy: this.state().sortBy,
    sortDirection: this.state().sortDirection,
    ...(this.query() ? { keyword: this.query() } : {}),
    categoryIds: this.state().categoryIds || [] ,
    anyLocationIds: this.state().anyLocationIds || []
  }));

  constructor() {
    effect(() => this.load(this.request()));
  }

  private load(req: VendorSearchRequest): void {
    this.loading.set(true);
    this.vendorService.searchVendors(req)
      .pipe(
        // The public path returns VendorSummaryResponse; the admin path
        // returns VendorResponse. `searchVendors` is typed as the latter,
        // so we narrow to the summary shape here. Every field the view
        // reads is present on both.
        map(page => page as unknown as DataPage<VendorSummary>),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: page => { this.result.set(page); this.loading.set(false); },
        error: err => {
          this.loading.set(false);
          this.toast.show('Échec du chargement des restaurants', 'error');
          console.error(err);
        },
      });
  }

  // ─── View events ──────────────────────────────────────────

  protected onFilterChange(state: DirectoryFilterState): void {
    this.state.set(state);
    this.page.set(state.page);
    this.query.set(state.query);
  }

  protected onSelectVendor(vendor: VendorSummary): void {
    this.router.navigate(['/meals/vendor/directory', vendor.id]);
  }
}
