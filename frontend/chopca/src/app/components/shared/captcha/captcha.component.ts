import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
} from '@angular/core';
import { NgxTurnstileComponent } from 'ngx-turnstile';
import { IconComponent } from '@components/shared/icon/icon.component';
import { FormErrorComponent } from '@components/shared/form-error/form-error.component';
import { environment } from '@environments/environment';

/**
 * Cloudflare Turnstile wrapper.
 *
 * Renders the Turnstile widget and emits the verification token.
 * The token is valid for 300 seconds and can only be verified once —
 * the parent should include it in the submission payload and reset
 * the widget if the submission fails.
 *
 * The secret key is NEVER on the frontend. Only the public site key
 * (from `environment.turnstileSiteKey`) is used here. Verification
 * happens on the backend.
 *
 * Usage:
 *   <app-captcha
 *     [error]="captchaError()"
 *     (tokenReceived)="onCaptchaToken($event)" />
 */
@Component({
  selector: 'app-captcha',
  standalone: true,
  imports: [NgxTurnstileComponent, IconComponent, FormErrorComponent],
  templateUrl: './captcha.component.html',
  styleUrl: './captcha.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CaptchaComponent {

  /** Optional error message shown under the widget. */
  readonly error = input<string | null>(null);

  /** Site key from environment. Exposed for the template. */
  protected readonly siteKey = environment.turnstileSiteKey;

  /** Emits the Turnstile token (empty string when the widget resets/expires). */
  readonly tokenReceived = output<string>();

  protected onResolved(token: string | null): void {
    this.tokenReceived.emit(token ?? '');
  }
}
