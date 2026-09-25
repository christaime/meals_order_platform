import {
  Component,
  ChangeDetectionStrategy,
  computed,
  input,
  output,
} from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { IconComponent } from '@components/shared/icon/icon.component';
import { ImageUploaderComponent } from '@components/shared/image-uploader/image-uploader.component';
import { MediaRef, MediaUploadResponse } from '@app/core/models/marketplace';

/**
 * Section C — Identité Visuelle & Vitrine.
 *
 * Two independent uploads:
 *   - logo   → profileImageStorageRef
 *   - banner → coverImageStorageRef
 *
 * Each uploader has its own output pair so the parent can react to
 * either independently. The section does not decide which event to
 * route based on an ambiguous `uploaded` output — the wiring is
 * explicit.
 *
 * `MediaUploadResponse.id` and `MediaRef.id` ARE the storage ref
 * (the S3 object key), not a database id.
 */
@Component({
  selector: 'app-visuals',
  standalone: true,
  imports: [ReactiveFormsModule, IconComponent, ImageUploaderComponent],
  templateUrl: './visuals.component.html',
  styleUrl: './visuals.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VisualsComponent {

  // ─── Inputs ───────────────────────────────────────────────

  /** Parent-owned form. Controls: profileImageStorageRef, coverImageStorageRef. */
  readonly form = input.required<FormGroup>();

  /** Existing logo to display (edit mode). `id` is the storage ref. */
  readonly profileMediaRef = input<MediaRef | null>(null);

  /** Existing banner to display (edit mode). `id` is the storage ref. */
  readonly coverMediaRef = input<MediaRef | null>(null);

  // ─── Outputs ──────────────────────────────────────────────

  readonly logoUploaded  = output<MediaUploadResponse>();
  readonly logoCleared   = output<void>();
  readonly coverUploaded = output<MediaUploadResponse>();
  readonly coverCleared  = output<void>();

  // ─── Derived ──────────────────────────────────────────────

  protected readonly profileRef = computed<string | null>(() => {
    const v = this.form().get('profileImageStorageRef')?.value;
    return typeof v === 'string' && v.length > 0 ? v : null;
  });

  protected readonly coverRef = computed<string | null>(() => {
    const v = this.form().get('coverImageStorageRef')?.value;
    return typeof v === 'string' && v.length > 0 ? v : null;
  });
}
