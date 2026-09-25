import {
  Component,
  ChangeDetectionStrategy,
  input,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { INPUT_CLASSES } from '@components/shared/form-field/input-classes';

/**
 * A single payout account card.
 *
 * Renders:
 * - A label row with a status dot on the right
 * - An input bound to a FormControl
 * - A hint line below the input
 *
 * All variations between accounts are driven by inputs. The card
 * has no internal state, no validation logic — the parent owns the
 * FormControl and its validators.
 *
 * Usage:
 *   <app-payout-account-card
 *     label="MTN MoMo"
 *     placeholder="67X XX XX XX"
 *     [control]="payoutMtnPhone"
 *     [hint]="mtnHolderHint()" />
 */
@Component({
  selector: 'app-payout-account-card',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './payout-account-card.component.html',
  styleUrl: './payout-account-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PayoutAccountCardComponent {

  // ─── Required inputs ──────────────────────────────────────
  /** The account label (e.g. "MTN MoMo", "Orange Money", "RIB Bancaire"). */
  readonly label = input.required<string>();

  /** The FormControl bound to the input. */
  readonly control = input.required<FormControl>();

  // ─── Optional inputs ──────────────────────────────────────
  /** Input type — 'tel' for phone numbers, 'text' for IBAN. Default: 'tel'. */
  readonly inputType = input<'tel' | 'text' | 'email'>('tel');

  /** Placeholder shown when the input is empty. */
  readonly placeholder = input<string>('');

  /** Hint text below the input (holder name, threshold, etc.). */
  readonly hint = input<string | null >(null);

  /**
   * Whether this account is optional.
   * Controls:
   * - The "(Optionnel)" label suffix
   * - The status dot color (green vs gray) and size
   * - The card opacity (dimmed when optional)
   */
  readonly optional = input<boolean>(false);

  // ─── Exposed for the template ─────────────────────────────
  protected readonly INPUT_CLASSES = INPUT_CLASSES;
}
