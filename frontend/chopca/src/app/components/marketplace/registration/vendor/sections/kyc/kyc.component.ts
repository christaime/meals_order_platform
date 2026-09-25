import {
  Component,
  ChangeDetectionStrategy,
  computed,
  input,
  output,
} from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { IconComponent } from '@components/shared/icon/icon.component';
import { ImageUploaderComponent } from '@components/shared/image-uploader/image-uploader.component';
import { MediaRef, MediaUploadResponse } from '@app/core/models/marketplace';

/**
 * Section E — Modération Réglementaire & Documents KYC.
 *
 * Two independent uploads:
 *   - CNI front → idCardFrontStorageRef
 *   - CNI back  → idCardBackStorageRef
 *
 * The `termsCertify` checkbox is a form control owned by the parent.
 * This section only renders it and reads its state for the "Conforme"
 * badge. No form mutation happens here — the parent's handlers write
 * to the form and cache the resolved URLs.
 *
 * IMPORTANT: `MediaUploadResponse.id` and `MediaRef.id` ARE the
 * storage ref (the S3 object key), not a database id.
 */
@Component({
  selector: 'app-kyc',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatCheckboxModule,
    IconComponent,
    ImageUploaderComponent,
  ],
  templateUrl: './kyc.component.html',
  styleUrl: './kyc.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KycComponent {

  // ─── Inputs ───────────────────────────────────────────────

  /** Parent-owned form. Controls: idCardFrontStorageRef, idCardBackStorageRef, termsCertify. */
  readonly form = input.required<FormGroup>();

  /** Existing CNI front (edit mode). `mediaRef.id` is the storage ref. */
  readonly frontMediaRef = input<MediaRef | null>(null);

  /** Existing CNI back (edit mode). `mediaRef.id` is the storage ref. */
  readonly backMediaRef = input<MediaRef | null>(null);

  // ─── Outputs ──────────────────────────────────────────────

  /** Fires after a successful CNI front upload. */
  readonly frontUploaded = output<MediaUploadResponse>();

  /** Fires when the user removes the CNI front. */
  readonly frontCleared = output<void>();

  /** Fires after a successful CNI back upload. */
  readonly backUploaded = output<MediaUploadResponse>();

  /** Fires when the user removes the CNI back. */
  readonly backCleared = output<void>();

  // ─── Derived ──────────────────────────────────────────────

  /** Whether both CNI refs are populated. Drives the "Conforme" badge. */
  protected readonly bothUploaded = computed<boolean>(
    () => !!this.frontRef() && !!this.backRef()
  );

  protected readonly frontRef = computed<string | null>(() => {
    const v = this.form().get('idCardFrontStorageRef')?.value;
    return typeof v === 'string' && v.length > 0 ? v : null;
  });

  protected readonly backRef = computed<string | null>(() => {
    const v = this.form().get('idCardBackStorageRef')?.value;
    return typeof v === 'string' && v.length > 0 ? v : null;
  });

  protected readonly termsCertify = computed<boolean>(
    () => this.form().get('termsCertify')?.value === true
  );
}
