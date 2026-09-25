import { Component, ChangeDetectionStrategy, output, input } from '@angular/core';

export type SocialProvider = 'google' | 'outlook' | 'yahoo';

/**
 * Social login/signup buttons — Google, Outlook, Yahoo.
 *
 * Pure presentational component — emits the provider the user clicked
 * and lets the parent decide what to do (redirect to Keycloak, etc.).
 *
 * Layout: vertical stack — each button is full-width and prominent,
 * since these are the primary action on auth pages.
 *
 * The brand SVGs are inlined so they ship with the bundle and don't
 * require external requests.
 *
 * Usage:
 *   <app-social-login-buttons
 *     (providerClick)="onSocialLogin($event)" />
 *
 *   <app-social-login-buttons
 *     [disabled]="isLoading()"
 *     [ctaLabel]="'Continuer avec'"
 *     (providerClick)="onSocialLogin($event)" />
 */
@Component({
  selector: 'app-social-login-buttons',
  standalone: true,
  imports: [],
  templateUrl: './social-login-buttons.component.html',
  styleUrl: './social-login-buttons.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SocialLoginButtonsComponent {

  /** Disables both buttons (e.g. while another request is in flight). */
  readonly disabled = input<boolean>(false);

  /** CTA prefix shown on each button. Default: "Continuer avec". */
  readonly ctaLabel = input<string>('Continuer avec');

  /** Emits the provider the user clicked. */
  readonly providerClick = output<SocialProvider>();

  protected onClick(provider: SocialProvider): void {
    if (this.disabled()) return;
    this.providerClick.emit(provider);
  }
}
