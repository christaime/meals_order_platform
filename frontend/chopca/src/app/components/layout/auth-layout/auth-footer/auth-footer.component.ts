import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '@components/shared/icon/icon.component';

/**
 * Minimal footer used on all vendor-auth pages.
 *
 * Contains:
 * - Trust line ("Chop ça! Cameroun • Yaoundé & Douala")
 * - Accepted payment methods (MTN MoMo, Orange Money)
 * - WhatsApp Pro support link
 * - Legal links
 *
 * Smaller than the public FooterComponent — no link columns, no brand block.
 * The vendor portal should feel focused, not like a marketing site.
 */
@Component({
  selector: 'app-auth-footer',
  standalone: true,
  imports: [RouterLink, IconComponent],
  templateUrl: './auth-footer.component.html',
  styleUrl: './auth-footer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthFooterComponent {

  /** WhatsApp support phone number (placeholder for now). */
  readonly whatsappUrl = 'https://wa.me/237600000000';

  /** Accepted payment methods shown as pills. */
  readonly paymentMethods = [
    'MTN MoMo',
    'Orange Money',
  ] as const;
}
