import {
  Component,
  ChangeDetectionStrategy,
  input,
  signal,
  computed,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { IconComponent } from '@components/shared/icon/icon.component';
import { FormFieldComponent } from '@components/shared/form-field/form-field.component';
import { INPUT_CLASSES } from '@components/shared/form-field/input-classes';

/**
 * Password input with a show/hide toggle.
 *
 * Unlike the other shared fields, this component OWNS its input. The
 * visibility toggle needs to flip the input's `type` between "password"
 * and "text", which only works if the same component controls both the
 * input and the button.
 *
 * The parent passes a Reactive FormControl directly.
 *
 * Usage:
 *   <app-password-field
 *     label="Mot de passe"
 *     [required]="true"
 *     [control]="passwordControl"
 *     [error]="passwordError()" />
 */
@Component({
  selector: 'app-password-field',
  standalone: true,
  imports: [IconComponent, FormFieldComponent, ReactiveFormsModule],
  templateUrl: './password-field.component.html',
  styleUrl: './password-field.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PasswordFieldComponent {

  // ─── Public API ───────────────────────────────────────────
  /** The Reactive Form control this field drives. Required. */
  readonly control = input.required<FormControl>();

  readonly label = input<string>('Mot de passe');
  readonly placeholder = input<string>('••••••••••••');
  readonly required = input<boolean>(false);
  readonly disabled = input<boolean>(false);
  readonly name = input<string | null>('password');
  readonly hint = input<string | null>(null);
  readonly trailingHint = input<string | null>(null);
  readonly error = input<string | null>(null);

  // ─── Exposed for the template ─────────────────────────────
  protected readonly INPUT_CLASSES = INPUT_CLASSES;

  // ─── Internal state (public readonly — read by the template) ───
  readonly visible = signal<boolean>(false);

  protected readonly inputType = computed(() =>
    this.visible() ? 'text' : 'password'
  );

  protected readonly toggleIcon = computed(() =>
    this.visible() ? 'visibility_off' : 'visibility'
  );

  protected readonly toggleAriaLabel = computed(() =>
    this.visible() ? 'Masquer le mot de passe' : 'Afficher le mot de passe'
  );

  // ─── Actions ──────────────────────────────────────────────
  protected toggleVisibility(event: MouseEvent): void {
    event.preventDefault();
    this.visible.update(v => !v);
  }
}
