import {
  ChangeDetectionStrategy,
  Component,
  effect,
  input,
  output,
} from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { IconComponent } from '@components/shared';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslatePipe } from '@ngx-translate/core';
import { City, CityRequest } from '@app/core/models/marketplace';

/**
 * City create / edit form.
 *
 * The form owns the following controls:
 *   - name        : string, required, 2–120
 *   - region      : string, optional, max 120
 *   - countryCode : string, required, 2 chars — locked to "CM"
 *
 * Emits the parsed {@link CityRequest} on submit.
 * `editing` is the entity to edit; pass `null` to create a new one.
 */
@Component({
  selector: 'app-city-form',
  standalone: true,
  imports: [
    TranslatePipe,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    IconComponent
  ],
  templateUrl: './city-form.component.html',
  styleUrl: './city-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CityFormComponent {

  private readonly fb = new FormBuilder();

  /** The city currently being edited; `null` = create mode. */
  readonly editing = input<City | null>(null);

  /** True while the parent is persisting the request. */
  readonly submitting = input<boolean>(false);

  /** Emits the parsed request on submit. */
  readonly submitted = output<CityRequest>();

  /** Emits when the user cancels an edit. */
  readonly cancelEdit = output<void>();

  // Country is fixed to CM (Cameroon) for now.
  // If the platform expands, unlock this control.
  protected readonly countryLocked = true;

  readonly form = this.fb.nonNullable.group({
    name: ['', [
      Validators.required,
      Validators.minLength(2),
      Validators.maxLength(120),
    ]],
    region: ['', [Validators.maxLength(120)]],
    countryCode: [
      { value: 'CM', disabled: this.countryLocked },
      [Validators.required, Validators.minLength(2), Validators.maxLength(2)],
    ],
  });

  // Re-seed the form whenever `editing` changes.
  // `allowSignalWrites` is required because we call form APIs inside the effect.
  constructor() {
    effect(() => {
      const city = this.editing();
      if (city) {
        this.form.patchValue(
          { name: city.name, region: city.region ?? '', countryCode: city.countryCode },
          { emitEvent: false },
        );
      } else {
        this.form.reset(
          { name: '', region: '', countryCode: 'CM' },
          { emitEvent: false },
        );
      }
    }, { allowSignalWrites: true });
  }

  protected get name() { return this.form.controls.name; }
  protected get region() { return this.form.controls.region; }
  protected get countryCode() { return this.form.controls.countryCode; }

  protected nameErrorKey(): string | null {
    const c = this.name;
    if (!c.touched || !c.errors) return null;
    if (c.errors['required'])  return 'cityForm.name.required';
    if (c.errors['minlength']) return 'cityForm.name.minLength';
    if (c.errors['maxlength']) return 'cityForm.name.maxLength';
    return null;
  }

  protected regionErrorKey(): string | null {
    const c = this.region;
    if (!c.touched || !c.errors) return null;
    if (c.errors['maxlength']) return 'cityForm.region.maxLength';
    return null;
  }

  protected onSubmit(): void {
    if (this.submitting()) return;
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    const raw = this.form.getRawValue();     // getRawValue includes disabled controls
    this.submitted.emit({
      name: raw.name.trim(),
      region: raw.region?.trim() || null,
      countryCode: raw.countryCode,
    });
  }

  protected onCancel(): void {
    if (this.submitting()) return;
    this.cancelEdit.emit();
  }
}
