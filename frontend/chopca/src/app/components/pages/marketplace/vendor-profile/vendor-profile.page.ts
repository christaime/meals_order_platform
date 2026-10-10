import {
  Component,
  ChangeDetectionStrategy,
  signal,
  inject,
  OnInit,
  DestroyRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';

import { IconComponent } from '@components/shared';
import { VENDOR_SERVICE } from '@core/services/marketplace/vendor.service';
import { Vendor } from '@core/models/marketplace';
import { ToastService } from '@components/shared/toast/toast.service';

/**
 * "Mon restaurant" — the vendor's own view of their business.
 *
 * Read-only for now: renders the record returned by
 * `VendorService.getOwnProfile()`. Editing will be added in a later
 * pass; the shape of the page (sections, layout) is what matters here.
 */
@Component({
  selector: 'app-vendor-profile',
  standalone: true,
  imports: [CommonModule, IconComponent],
  templateUrl: './vendor-profile.page.html',
  styleUrl: './vendor-profile.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VendorProfilePageComponent implements OnInit {

  private readonly vendorService = inject(VENDOR_SERVICE);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  readonly vendor = signal<Vendor | null>(null);
  readonly isLoading = signal<boolean>(true);
  readonly hasError = signal<boolean>(false);

  ngOnInit(): void {
    this.vendorService.getOwnProfile()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (vendor) => {
          this.vendor.set(vendor);
          this.isLoading.set(false);
        },
        error: (err) => {
          console.error('[VendorProfile] load failed', err);
          this.hasError.set(true);
          this.isLoading.set(false);
          this.toast.show('Échec du chargement du profil', 'error');
        },
      });
  }
}
