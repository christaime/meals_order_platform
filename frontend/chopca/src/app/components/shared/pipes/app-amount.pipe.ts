import { Pipe, PipeTransform, inject, LOCALE_ID } from '@angular/core';
import { CurrencyPipe } from '@angular/common';

export type AmountFormat = 'default' | 'short';

/**
 * Formats a numeric amount using the app's default currency.
 *
 * The app currency is XAF (FCFA). Centralizing the format here means
 * changing it is a one-file edit — no hunting through templates.
 *
 * Usage:
 *   {{ meal.price | appAmount }}          → "1 500 FCFA"
 *   {{ meal.price | appAmount:'short' }}  → "1.5k FCFA"
 *   {{ null | appAmount }}                → "" (empty string, not "null")
 *
 * The pipe is pure, so Angular only recomputes when the input value
 * changes. Safe to use in loops.
 */
@Pipe({
  name: 'appAmount',
  standalone: true,
  pure: true,
})
export class AppAmountPipe implements PipeTransform {

  private readonly locale = inject(LOCALE_ID);
  private readonly currencyPipe = new CurrencyPipe(this.locale);

  /** The app's currency code. Change here to change everywhere. */
  private static readonly CURRENCY = 'XAF';

  /** Whether to render "XAF" or the locale-appropriate symbol. */
  private static readonly DISPLAY: 'code' | 'symbol' | 'symbol-narrow' = 'symbol';

  /** Decimal precision for the default format. */
  private static readonly DIGITS = '1.0-0';

  transform(
    value: number | null | undefined,
    format: AmountFormat = 'default',
  ): string {
    if (value == null || Number.isNaN(value)) {
      return '';
    }

    if (format === 'short') {
      return this.shortFormat(value);
    }

    return this.currencyPipe.transform(
      value,
      AppAmountPipe.CURRENCY,
      AppAmountPipe.DISPLAY,
      AppAmountPipe.DIGITS,
      this.locale,
    ) ?? '';
  }

  /**
   * Compact form for tight spaces: 1500 → "1.5k FCFA", 25000 → "25k FCFA".
   * Rounds to no decimals above 1000 to keep the string short.
   */
  private shortFormat(value: number): string {
    const abs = Math.abs(value);
    const sign = value < 0 ? '-' : '';

    if (abs >= 1_000_000) {
      return `${sign}${(abs / 1_000_000).toFixed(1)}M FCFA`;
    }
    if (abs >= 1_000) {
      return `${sign}${Math.round(abs / 1_000)}k FCFA`;
    }
    return `${sign}${abs} FCFA`;
  }
}
