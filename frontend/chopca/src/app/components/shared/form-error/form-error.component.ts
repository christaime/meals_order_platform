import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { IconComponent } from '@components/shared/icon/icon.component';

/**
 * Inline validation error message.
 *
 * Renders nothing if `message` is falsy — safe to always include
 * in a template without a conditional wrapper.
 *
 * Usage:
 *   <app-form-error [message]="emailError()" />
 *   <app-form-error [message]="'Email requis'" />
 */
@Component({
  selector: 'app-form-error',
  standalone: true,
  imports: [IconComponent],
  templateUrl: './form-error.component.html',
  styleUrl: './form-error.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormErrorComponent {

  /** The error message. Nothing renders if null/empty. */
  readonly message = input<string | null>(null);

  /** Optional icon name (defaults to `error`). */
  readonly icon = input<string>('error');
}
