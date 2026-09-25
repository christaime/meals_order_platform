import { Component, ChangeDetectionStrategy, input, computed } from '@angular/core';
import { IconComponent } from '@components/shared/icon/icon.component';
import { FormErrorComponent } from '@components/shared/form-error/form-error.component';

/**
 * Visual wrapper for a single form field.
 *
 * Renders label, optional hint, optional leading icon, optional trailing slot,
 * and an optional error message — arranged around whatever input the parent
 * projects.
 *
 * This component is a pure presentation layer. It owns NO FormControl.
 * The parent owns the control and projects its `<input>` (or `<textarea>`
 * / `<select>`) with the `appProjectedInput` attribute.
 *
 * The parent styles its own input using the exported INPUT_CLASSES constant
 * (see ./input-classes.ts).
 *
 * Usage:
 *   <app-form-field
 *     label="Email professionnel"
 *     iconLeading="alternate_email"
 *     [required]="true"
 *     trailingHint="Format CM ou Email"
 *     [error]="emailError()">
 *
 *     <input
 *       appProjectedInput
 *       [class]="INPUT_CLASSES"
 *       type="email"
 *       [formControl]="emailControl"
 *       placeholder="contact@chezmamanpauline.cm" />
 *   </app-form-field>
 */
@Component({
  selector: 'app-form-field',
  standalone: true,
  imports: [IconComponent, FormErrorComponent],
  templateUrl: './form-field.component.html',
  styleUrl: './form-field.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormFieldComponent {

  readonly label = input<string>('');
  readonly required = input<boolean>(false);

  readonly hint = input<string | null>(null);
  readonly trailingHint = input<string | null>(null);
  readonly iconLeading = input<string | null>(null);
  readonly error = input<string | null>(null);

  protected readonly fieldId = computed(
    () => `field-${Math.random().toString(36).slice(2, 9)}`
  );

  protected readonly wrapperClasses = computed(() => {
    const base = [
      'relative',
      'flex',
      'items-center',
      'w-full',
      'bg-surface-container-low',
      'rounded-lg',
      'transition-colors',
      'shadow-inner',
      'focus-within:bg-surface-container-lowest',
    ];
    if (this.error()) base.push('ring-1', 'ring-error');
    return base.join(' ');
  });

  protected readonly leadingIconClasses = computed(() =>
    [
      'absolute',
      'left-3.5',
      'top-1/2',
      '-translate-y-1/2',
      'pointer-events-none',
      'inline-flex',
      'items-center',
      'text-on-surface-variant',
    ].join(' ')
  );

  protected readonly contentPaddingClasses = computed(() =>
    this.iconLeading() ? 'flex-1 pl-11' : 'flex-1'
  );
}
