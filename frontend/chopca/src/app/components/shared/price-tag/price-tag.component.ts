import { Component, computed, input } from '@angular/core';

export type PriceVariant = 'default' | 'compact' | 'large';

/**
 * Price display in XAF (CFA Franc).
 *
 * Uses fr-FR formatting (space as thousands separator).
 * Renders the currency suffix as a smaller, muted label.
 *
 * Usage:
 *   <app-price-tag [amount]="4500" />
 *   <app-price-tag [amount]="4500" variant="large" />
 *   <app-price-tag [amount]="4500" variant="compact" />
 */
@Component({
  selector: 'app-price-tag',
  standalone: true,
  imports: [],
  templateUrl: './price-tag.component.html',
  styleUrl: './price-tag.component.scss',
})
export class PriceTagComponent {

  /** Amount in XAF. Integer expected (no cents in XAF). */
  readonly amount = input.required<number>();

  /** Visual variant. */
  readonly variant = input<PriceVariant>('default');

  /** Currency code shown as suffix. */
  readonly currency = input<string>('XAF');

  /** Formatted number with fr-FR grouping (e.g. "4 500"). */
  protected readonly formattedAmount = computed(() =>
    new Intl.NumberFormat('fr-FR', {
      maximumFractionDigits: 0,
    }).format(this.amount())
  );

  protected readonly classes = computed(() =>
    `price price-${this.variant()}`
  );
}
