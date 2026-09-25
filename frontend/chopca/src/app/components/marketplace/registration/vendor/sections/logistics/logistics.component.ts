import {
  Component,
  ChangeDetectionStrategy,
  computed,
  input,
  signal,
} from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSliderModule } from '@angular/material/slider';
import { IconComponent } from '@components/shared/icon/icon.component';

/**
 * Section D — Géolocalisation & Logistique Flotte.
 *
 * Parent-owned FormGroup must contain:
 *   - address        : string, required, max 255
 *   - pickupAddress  : string, max 255
 *   - deliveryRadius : number, required, 1–25 (km)
 *
 * The "sameAddress" toggle is UI-only — it is NOT a form control.
 * When checked, `pickupAddress` mirrors `address` and is disabled.
 * When unchecked, the user edits `pickupAddress` freely.
 *
 * The mirroring is applied on:
 *   - toggle of the checkbox (onSameAddressToggle)
 *   - every input in the main address field (onAddressInput)
 *
 * The component does NOT subscribe to `address.valueChanges` — the
 * template calls `onAddressInput` explicitly, which keeps the flow
 * easy to trace and avoids the "when is `form()` available?" problem
 * that a constructor-time subscription would hit with signal inputs.
 */
@Component({
  selector: 'app-logistics',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatSliderModule,
    IconComponent,
  ],
  templateUrl: './logistics.component.html',
  styleUrl: './logistics.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LogisticsComponent {

  // ─── Inputs ───────────────────────────────────────────────

  /** Parent-owned form. See class doc for required controls. */
  readonly form = input.required<FormGroup>();

  // ─── UI state (not part of the form) ──────────────────────

  /** Whether the pickup address mirrors the main address. */
  protected readonly sameAddress = signal<boolean>(true);

  // ─── Derived form values ──────────────────────────────────

  /** Current delivery radius, bound to the slider thumb label. */
  protected readonly radius = computed<number>(() => {
    const v = this.form().get('deliveryRadius')?.value;
    return typeof v === 'number' ? v : 8;
  });

  /** Diameter in px for the radar ring, driven by the radius value. */
  protected readonly radarSize = computed<number>(() => 40 + this.radius() * 4);

  // ─── Actions ──────────────────────────────────────────────

  /**
   * Called when the "same as main address" checkbox is toggled.
   * Mirrors or releases the pickup field accordingly.
   */
  protected onSameAddressToggle(checked: boolean): void {
    this.sameAddress.set(checked);

    const addressCtrl = this.form().get('address');
    const pickupCtrl = this.form().get('pickupAddress');
    if (!addressCtrl || !pickupCtrl) return;

    if (checked) {
      pickupCtrl.setValue(addressCtrl.value ?? '');
      pickupCtrl.disable({ emitEvent: false });
    } else {
      pickupCtrl.enable({ emitEvent: false });
    }
  }

  /**
   * Called on every keystroke in the main address field.
   * If the checkbox is checked, mirrors the value into pickup.
   */
  protected onAddressInput(value: string): void {
    if (!this.sameAddress()) return;
    const pickupCtrl = this.form().get('pickupAddress');
    if (pickupCtrl && pickupCtrl.enabled) {
      pickupCtrl.setValue(value, { emitEvent: false });
    }
  }
}
