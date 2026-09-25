import {
  Component,
  ChangeDetectionStrategy,
  computed,
  input,
  output,
} from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { IconComponent } from '@components/shared/icon/icon.component';

/**
 * Section A — Établissement & Propriétaire.
 *
 * Parent-owned FormGroup must contain these controls:
 *   - businessName : string, required, min 2, max 100
 *   - ownerName    : string, required, min 2, max 100
 *   - phone        : string, required, CEMAC phone pattern
 *   - description  : string, optional, max 2000
 *
 * The "inspirations" chips emit a snippet the parent appends to the
 * description control. This component does not touch the control
 * directly — the parent owns all form mutations.
 */
@Component({
  selector: 'app-identity',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    IconComponent,
  ],
  templateUrl: './identity.component.html',
  styleUrl: './identity.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IdentityComponent {

  // ─── Inputs ───────────────────────────────────────────────

  /** Parent-owned form. See class doc for required controls. */
  readonly form = input.required<FormGroup>();

  // ─── Outputs ──────────────────────────────────────────────

  /** Emitted when the user clicks an inspiration chip. */
  readonly appendInspiration = output<string>();

  // ─── Derived ──────────────────────────────────────────────

  protected readonly businessNameLength = computed(
    () => (this.form().get('businessName')?.value ?? '').length
  );

  protected readonly ownerNameLength = computed(
    () => (this.form().get('ownerName')?.value ?? '').length
  );

  protected readonly descriptionLength = computed(
    () => (this.form().get('description')?.value ?? '').length
  );

  // ─── Template helpers ─────────────────────────────────────

  protected onInspiration(snippet: string): void {
    this.appendInspiration.emit(snippet);
  }
}
