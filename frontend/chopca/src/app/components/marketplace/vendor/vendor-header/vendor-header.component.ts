import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Vendor, VendorSummary } from '@core/models/marketplace';
import {
  IconComponent,
  BadgeComponent,
  RatingStarsComponent,
} from '@components/shared';

/**
 * VendorHeaderComponent — Hero banner and core business profile details
 * displayed at the top of vendor profile and detail pages.
 */
@Component({
  selector: 'app-vendor-header',
  standalone: true,
  imports: [
    CommonModule,
    IconComponent,
    BadgeComponent,
    RatingStarsComponent,
  ],
  templateUrl: './vendor-header.component.html',
  styleUrl: './vendor-header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VendorHeaderComponent {
  // ─── Inputs & Outputs ──────────────────────────────────────────────
  /** Accepts full Vendor or lightweight VendorSummary */
  readonly vendor = input.required<Vendor | VendorSummary>();

  /** Emits when the user clicks the Share button */
  readonly share = output<Vendor | VendorSummary>();

  /** Emits when the user clicks the Contact button */
  readonly contact = output<Vendor | VendorSummary>();

  // ─── Computed State ────────────────────────────────────────────────
  readonly isOpen = computed(() => this.vendor().status === 'ACTIVE');

  readonly vendorInitial = computed(() => {
    const name = this.vendor().businessName;
    return name ? name.charAt(0).toUpperCase() : 'V';
  });

  readonly isProOrEnterprise = computed(() => {
    const tier = this.vendor().subscriptionTier;
    return tier === 'PRO' || tier === 'ENTERPRISE';
  });

  readonly coverImageUrl = computed(() => {
    const v = this.vendor();
    return 'coverImageUrl' in v ? v.coverImageUrl : null;
  });

  // ─── Actions ──────────────────────────────────────────────────────
  onShare(): void {
    this.share.emit(this.vendor());
  }

  onContact(): void {
    this.contact.emit(this.vendor());
  }
}
