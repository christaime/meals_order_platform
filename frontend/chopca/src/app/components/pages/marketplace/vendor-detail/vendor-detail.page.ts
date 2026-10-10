import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';

import {
  VendorDetailViewComponent,
  VendorMenuCategory,
} from '@components/marketplace/vendor/vendor-detail-view/vendor-detail-view.component';
import { VendorContextService } from '@core/services/marketplace/vendor-context.service';
import { VENDOR_SERVICE } from '@app/core/services/marketplace/vendor.service';
import { MEAL_SERVICE } from '@app/core/services/marketplace/meal.service';
import { ToastService } from '@components/shared/toast';
import { Vendor, VendorSummary } from '@app/core/models/marketplace';
import { MealSummary, MealSearchRequest } from '@app/core/models/marketplace';

@Component({
  selector: 'app-vendor-detail-page',
  standalone: true,
  imports: [VendorDetailViewComponent],
  providers: [VendorContextService],
  template: `
    <app-vendor-detail-view
      [vendor]="vendorSummary()"
      [isLoading]="loading()"
      />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VendorDetailPageComponent {

  /** Route param, bound via `withComponentInputBinding()`. */
  readonly vendorId = input<string | null>(null);
  private readonly ctx = inject(VendorContextService);

  private readonly vendorService = inject(VENDOR_SERVICE);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly loading = signal<boolean>(true);
  private readonly vendor = signal<Vendor | null>(null);

  // ─── View-shaped derived data ─────────────────────────────

  /** `Vendor` is a superset of `VendorSummary` — hand it over as-is. */
  protected readonly vendorSummary = computed<VendorSummary | null>(() => {
    const v = this.vendor();
    return v ? (v as unknown as VendorSummary) : null;
  });

  constructor() {
    effect(() => {
      const vendorId = this.vendorId();
      if (!vendorId) {
        this.loading.set(false);
        return;
      }
      this.ctx.vendorId.set(this.vendorId())
      this.load(vendorId);
    });
  }

  private load(vendorId: string): void {
    this.loading.set(true);

   this.vendorService.getVendorById(vendorId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (vendor) => {
          this.vendor.set(vendor);
          this.loading.set(false);
        },
        error: err => {
          this.loading.set(false);
          this.toast.show('Échec du chargement du restaurant', 'error');
          console.error(err);
        },
      });
  }

}
