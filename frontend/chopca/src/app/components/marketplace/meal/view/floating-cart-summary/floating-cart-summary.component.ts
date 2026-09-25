import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '@components/shared/icon/icon.component';
import { PriceTagComponent } from '@components/shared/price-tag/price-tag.component';

/**
 * FloatingCartSummaryComponent — Persistent bottom-right/bottom bar floating summary
 * showing total items, vendor preview, and total amount in XAF.
 */
@Component({
  selector: 'app-floating-cart-summary',
  standalone: true,
  imports: [CommonModule, IconComponent, PriceTagComponent],
  templateUrl: './floating-cart-summary.component.html',
  styleUrl: './floating-cart-summary.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FloatingCartSummaryComponent {
  /** Total count of items currently in cart. */
  readonly itemCount = input.required<number>();

  /** Total monetary amount in XAF. */
  readonly totalAmount = input.required<number>();

  /** Optional active vendor name to display context. */
  readonly vendorName = input<string | null>(null);

  /** Emits when user clicks the floating bar to open full cart drawer/page. */
  readonly openCart = output<void>();
}
