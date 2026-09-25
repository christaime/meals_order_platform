import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
} from '@angular/core';
import { IconComponent } from '@components/shared/icon/icon.component';
import { ImageUploaderComponent } from '@components/shared/image-uploader/image-uploader.component';
import { MediaRef, MediaUploadResponse } from '@app/core/models/marketplace';

/**
 * Step 1 — Meal photo card.
 *
 * Wraps the shared ImageUploaderComponent (wide shape) with:
 * - A "Format 4:3 recommandé" badge
 * - Crop / rotate / delete actions
 * - 3 quality tips at the bottom
 *
 * Outputs the picked File to the parent — the parent decides
 * whether to include it in the multipart submission.
 */
@Component({
  selector: 'app-meal-image-card',
  standalone: true,
  imports: [IconComponent, ImageUploaderComponent],
  templateUrl: './meal-image-card.component.html',
  styleUrl: './meal-image-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MealImageCardComponent {

  // ─── Inputs ───────────────────────────────────────────────
  /** Optional existing image URL (edit mode). */
  readonly initialPreviewUrl = input<string | null>(null);

  /** Optional error from the parent (e.g. server rejected the file). */
  readonly error = input<string | null>(null);

  /** Whether the card is disabled. */
  readonly disabled = input<boolean>(false);

  // ─── Outputs ──────────────────────────────────────────────
  /** Emits the picked File (or null when cleared). */
  readonly fileSelected = output<File | null>();

  /** Emits when the user clicks "Recadrer". */
  readonly cropRequested = output<void>();

  /** Emits when the user clicks "Pivoter". */
  readonly rotateRequested = output<void>();

  /** Emits when the user clicks "Retirer". */
  readonly removed = output<void>();

  readonly mediaRef = input<MediaRef | null>(null);
  readonly error = input<string | null>(null);
  readonly disabled = input<boolean>(false);

  readonly uploaded = output<MediaUploadResponse>();
  readonly cleared  = output<void>();

  readonly cropRequested = output<void>();
  readonly rotateRequested = output<void>();

  protected onCrop(): void   { if (!this.disabled()) this.cropRequested.emit(); }
  protected onRotate(): void { if (!this.disabled()) this.rotateRequested.emit(); }

  // ─── Actions ──────────────────────────────────────────────

  protected onFileSelected(file: File | null): void {
    this.fileSelected.emit(file);
  }

  protected onCrop(): void {
    if (this.disabled()) return;
    this.cropRequested.emit();
  }

  protected onRotate(): void {
    if (this.disabled()) return;
    this.rotateRequested.emit();
  }

  protected onRemove(): void {
    if (this.disabled()) return;
    this.removed.emit();
  }
}
