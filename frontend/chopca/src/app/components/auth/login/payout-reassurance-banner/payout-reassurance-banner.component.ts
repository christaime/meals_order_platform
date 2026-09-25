import { Component, ChangeDetectionStrategy } from '@angular/core';
import { IconComponent } from '@components/shared/icon/icon.component';

/**
 * Full-width reassurance banner about vendor payouts.
 *
 * Appears below the main content on the vendor login page.
 * Tells vendors that:
 * - Their earnings are transferred to mobile money daily
 * - MTN MoMo, Orange Money, and bank transfers are supported
 *
 * Static content — no inputs, no state.
 */
@Component({
  selector: 'app-payout-reassurance-banner',
  standalone: true,
  imports: [IconComponent],
  templateUrl: './payout-reassurance-banner.component.html',
  styleUrl: './payout-reassurance-banner.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PayoutReassuranceBannerComponent {

  /** Payment methods displayed as pills on the right. */
  readonly paymentMethods = [
    'MTN Mobile Money',
    'Orange Money',
    'Virement UBA / Afriland',
  ] as const;
}
