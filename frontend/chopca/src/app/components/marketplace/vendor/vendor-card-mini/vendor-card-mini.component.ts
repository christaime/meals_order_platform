import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '@components/shared/icon/icon.component';
import { RatingStarsComponent } from '@components/shared/rating-stars/rating-stars.component';
import { VendorSummary } from '@core/models/marketplace';

/**
 * VendorCardMiniComponent — Compact representation of a vendor/restaurant
 * for marketplace feeds and recommendation carousels using domain models.
 */
@Component({
  selector: 'app-vendor-card-mini',
  standalone: true,
  imports: [CommonModule, IconComponent, RatingStarsComponent],
  templateUrl: './vendor-card-mini.component.html',
  styleUrl: './vendor-card-mini.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VendorCardMiniComponent {
  // ─── Signals ──────────────────────────────────────────────────────
  readonly vendor = input.required<VendorSummary>();

  /** Emitted when the entire vendor card is clicked. */
  readonly selectVendor = output<VendorSummary>();

  // ─── Computed Properties ──────────────────────────────────────────
  readonly formattedCuisines = computed(() =>
    this.vendor().cuisines?.slice(0, 2).map((c) => c.name).join(' • ') ?? ''
  );

  readonly isOpen = computed(() => this.vendor().status === 'ACTIVE');

  // ─── Actions ──────────────────────────────────────────────────────
  onVendorClick(): void {
    this.selectVendor.emit(this.vendor());
  }
}
