import { Directive } from '@angular/core';

/**
 * Marker directive for inputs projected into `<app-form-field>`.
 *
 * The presence of this directive on a projected element tells
 * FormFieldComponent to render it (as opposed to its own built-in
 * input, which we removed under Option B).
 *
 * Usage:
 *   <app-form-field label="Email">
 *     <input appProjectedInput [formControl]="emailControl" />
 *   </app-form-field>
 */
@Directive({
  selector: '[appProjectedInput]',
  standalone: true,
})
export class ProjectedInputDirective {}
