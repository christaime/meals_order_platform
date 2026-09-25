import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { VendorSummary } from '@core/models/marketplace';
import {
  IconComponent,
  BadgeComponent,
  RatingStarsComponent,
} from '@components/shared';

/**
 * VendorCardComponent — Standard grid card displaying restaurant/vendor overview.
 * Compliant with lightweight VendorSummary domain model.
 */
@Component({
  selector: 'app-vendor-card',
  standalone: true,
  imports: [
    CommonModule,
    IconComponent,
    BadgeComponent,
    RatingStarsComponent,
  ],
  templateUrl: './vendor-card.component.html',
  styleUrl: './vendor-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VendorCardComponent {
  // ─── Inputs & Outputs ──────────────────────────────────────────────
  readonly vendor = input.required<VendorSummary>();
  readonly selectVendor = output<VendorSummary>();

  // ─── Computed State ────────────────────────────────────────────────
  readonly isOpen = computed(() => this.vendor().status === 'ACTIVE');

  readonly vendorInitial = computed(() => {
    const name = this.vendor().businessName;
    return name ? name.charAt(0).toUpperCase() : 'V';
  });

  readonly cuisineList = computed(() => {
    const cuisines = this.vendor().cuisines;
    return cuisines && cuisines.length > 0
      ? cuisines.slice(0, 3).map((c) => c.name)
      : [];
  });

  // ─── Actions ──────────────────────────────────────────────────────
  onSelectVendor(): void {
    this.selectVendor.emit(this.vendor());
  }
}
