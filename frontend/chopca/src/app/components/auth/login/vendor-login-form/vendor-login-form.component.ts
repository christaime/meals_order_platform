import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { IconComponent } from '@components/shared/icon/icon.component';
import { FormFieldComponent } from '@components/shared/form-field/form-field.component';
import { INPUT_CLASSES } from '@components/shared/form-field/input-classes';
import { PasswordFieldComponent } from '@components/shared/password-field/password-field.component';
import {
  SocialLoginButtonsComponent,
  SocialProvider,
} from '@components/shared/social-login-buttons/social-login-buttons.component';
import Keycloak from 'keycloak-js';

/**
 * Login form for the vendor portal.
 *
 * Contains:
 * - Email/phone field (identifier)
 * - Password field with visibility toggle
 * - "Rester connecté" checkbox
 * - Submit button with loading state
 * - Divider + social login buttons (Google Pro, Apple Business)
 * - "Not a partner yet" CTA card
 * - Trust footer (SSL + WhatsApp support)
 *
 * Uses Reactive Forms with validators. Submission is currently a no-op
 * (console log) — the auth service will be wired in a later phase.
 */
@Component({
  selector: 'app-vendor-login-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    IconComponent,
    FormFieldComponent,
    PasswordFieldComponent,
    SocialLoginButtonsComponent,
  ],
  templateUrl: './vendor-login-form.component.html',
  styleUrl: './vendor-login-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VendorLoginFormComponent {

  private readonly keycloak = inject(Keycloak);

  private readonly fb = inject(FormBuilder);

  /** Exposed for the template. */
  protected readonly INPUT_CLASSES = INPUT_CLASSES;

  /** WhatsApp support URL — replace with the real number later. */
  readonly whatsappUrl = 'https://wa.me/237600000000';

  /** Loading state — drives the submit button. */
  readonly submitting = signal<boolean>(false);

  /** Whether the social login buttons are disabled. */
  readonly socialDisabled = computed(() => this.submitting());

  // ─── Form ─────────────────────────────────────────────────
  readonly form = this.fb.nonNullable.group({
    identifier: ['', [
      Validators.required,
      Validators.minLength(3),
    ]],
    password: ['', [
      Validators.required,
      Validators.minLength(8),
    ]],
    remember: [true],
  });

  // ─── Error getters (template-friendly) ────────────────────

  protected readonly identifierError = computed(() => {
    const ctrl = this.form.controls.identifier;
    if (!ctrl.touched || !ctrl.errors) return null;
    if (ctrl.errors['required']) return 'Identifiant ou email requis';
    if (ctrl.errors['minLength']) return 'Trop court';
    return null;
  });

  protected readonly passwordError = computed(() => {
    const ctrl = this.form.controls.password;
    if (!ctrl.touched || !ctrl.errors) return null;
    if (ctrl.errors['required']) return 'Mot de passe requis';
    if (ctrl.errors['minLength']) return 'Minimum 8 caractères';
    return null;
  });

  // ─── Actions ──────────────────────────────────────────────

  onSubmit(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);

    // TODO: replace with authService.login(formValue) when Keycloak is wired.
    const value = this.form.getRawValue();
    console.log('[VendorLoginForm] submit', {
      identifier: value.identifier,
      remember: value.remember,
      // never log the password
    });

    // Simulate a request in flight so the loading state is visible.
    setTimeout(() => this.submitting.set(false), 1200);
  }

  onSocialLogin(provider: SocialProvider): void {
    if (this.socialDisabled()) return;

    this.keycloak.login({
      idpHint: provider,                               // 'google' | 'outlook' | 'yahoo'
      redirectUri: window.location.origin + '/meals',  // land on marketplace after login
    });
  }
}
