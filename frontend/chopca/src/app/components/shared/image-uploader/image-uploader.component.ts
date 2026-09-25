import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  signal,
  computed,
  inject,
  OnDestroy,
  DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { IconComponent } from '@components/shared/icon/icon.component';
import { MEDIA_SERVICE } from '@app/core/services/marketplace/media.service';
import {
  MediaRef,
  MediaPurpose,
  MediaUploadResponse,
} from '@app/core/models/marketplace';

export type ImageUploaderShape = 'circle' | 'square' | 'wide';

/**
 * Generic image picker + uploader.
 *
 * Owns the entire media lifecycle:
 *   pick → validate → upload → progress → retry → clear
 *
 * Outputs:
 *   - `uploaded` fires after a successful backend upload
 *   - `cleared`  fires when the user removes the current image
 *
 * Progress, validation, retry and blob-URL cleanup are internal.
 */
@Component({
  selector: 'app-image-uploader',
  standalone: true,
  imports: [MatProgressBarModule, IconComponent],
  templateUrl: './image-uploader.component.html',
  styleUrl: './image-uploader.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImageUploaderComponent implements OnDestroy {

  private readonly mediaService = inject(MEDIA_SERVICE);
  private readonly destroyRef = inject(DestroyRef);

  // ─── Configuration ───────────────────────────────────────
  /** Discriminator for the backend (MEAL_IMAGE, VENDOR_LOGO…). */
  readonly purpose = input.required<MediaPurpose>();

  /** Visual shape of the preview. */
  readonly shape = input<ImageUploaderShape>('square');

  /** Field label shown above the preview. */
  readonly label = input<string>('Image');

  /** Hint line under the label. */
  readonly hint = input<string | null>('JPEG, PNG ou WebP. Max 5 Mo.');

  /** Max file size in MB. */
  readonly maxSizeMb = input<number>(5);

  /** Allowed MIME types. */
  readonly allowedTypes = input<string[]>([
    'image/jpeg',
    'image/png',
    'image/webp',
  ]);

  /**
   * Existing media to display (edit mode).
   * Null means no image yet.
   */
  readonly mediaRef = input<MediaRef | null>(null);

  /** Optional external error (e.g. from a related save failure). */
  readonly error = input<string | null>(null);

  /** Disables the whole component. */
  readonly disabled = input<boolean>(false);

  // ─── Outputs ─────────────────────────────────────────────
  /** Fires after a successful backend upload. */
  readonly uploaded = output<MediaUploadResponse>();

  /** Fires when the user removes the current image. */
  readonly cleared = output<void>();

  // ─── Internal state ──────────────────────────────────────
  private readonly _localPreviewUrl = signal<string | null>(null);
  protected readonly fileName = signal<string | null>(null);
  protected readonly isDragOver = signal<boolean>(false);

  private readonly _validationError = signal<string | null>(null);
  private readonly _uploadError = signal<string | null>(null);

  protected readonly uploadProgress = signal<number>(0);
  protected readonly isUploading = signal<boolean>(false);

  /** The media currently displayed (from input or from a successful upload). */
  private readonly _currentMedia = signal<MediaRef | null>(null);

  /** File kept for retry after a failed upload. */
  protected readonly lastFile = signal<File | null>(null);

  // ─── Derived ─────────────────────────────────────────────
  protected readonly isImageOnly = computed(() =>
    this.allowedTypes().every(t => t.startsWith('image/')),
  );

  protected readonly previewUrl = computed(() =>
    this._localPreviewUrl()
      ?? this._currentMedia()?.url
      ?? this.mediaRef()?.url
      ?? null,
  );

  protected readonly hasPreview = computed(() => !!this.previewUrl());

  protected readonly displayedError = computed(() =>
    this._validationError() ?? this._uploadError() ?? this.error(),
  );

  protected readonly canRetry = computed(() =>
    !!this._uploadError() && !!this.lastFile() && !this.isUploading(),
  );

  // ─── Wrapper classes ─────────────────────────────────────
  protected readonly wrapperClasses = computed(() => {
    const base = [
      'relative', 'overflow-hidden', 'bg-surface-container-low',
      'border-2 border-dashed', 'flex items-center justify-center',
      'cursor-pointer', 'transition-all',
    ];

    if (this.isDragOver()) base.push('border-primary', 'bg-primary-fixed/20', 'scale-[1.02]');
    else if (this.previewUrl()) base.push('border-solid', 'border-primary');
    else if (this.displayedError()) base.push('border-error');
    else base.push('border-outline-variant/60', 'hover:border-primary/60');

    if (this.disabled()) base.push('opacity-60', 'cursor-not-allowed');

    switch (this.shape()) {
      case 'circle': base.push('w-24 h-24', 'rounded-full'); break;
      case 'wide':   base.push('w-full', 'aspect-video', 'rounded-xl'); break;
      default:       base.push('w-full', 'aspect-square', 'rounded-xl');
    }

    return base.join(' ');
  });

  // ─── Lifecycle ────────────────────────────────────────────

  ngOnDestroy(): void {
    this.revokeLocalPreview();
  }

  // ─── Picking ──────────────────────────────────────────────

  protected onFileInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (file) this.tryUpload(file);
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);
    if (this.disabled()) return;
    const file = event.dataTransfer?.files?.[0];
    if (file) this.tryUpload(file);
  }

  protected onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (!this.disabled()) this.isDragOver.set(true);
  }

  protected onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);
  }

  protected onPickerClick(input: HTMLInputElement): void {
    if (!this.disabled() && !this.isUploading()) input.click();
  }

  // ─── Upload flow ──────────────────────────────────────────

  private tryUpload(file: File): void {
    this._validationError.set(null);
    this._uploadError.set(null);

    if (!this.allowedTypes().includes(file.type)) {
      const labels = this.allowedTypes()
        .map(t => t.split('/')[1]?.toUpperCase() ?? t)
        .join(', ');
      this._validationError.set(`Format non supporté. Utilisez ${labels}.`);
      return;
    }

    if (file.size > this.maxSizeMb() * 1024 * 1024) {
      this._validationError.set(`Fichier trop volumineux (max ${this.maxSizeMb()} Mo).`);
      return;
    }

    this.revokeLocalPreview();
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      this._localPreviewUrl.set(url);
    }
    this.fileName.set(file.name);
    this.lastFile.set(file);

    this.performUpload(file);
  }

  private performUpload(file: File): void {
    this.isUploading.set(true);
    this.uploadProgress.set(0);
    this._uploadError.set(null);

    this.mediaService
      .upload(file, this.purpose(), p => this.uploadProgress.set(p))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result: MediaUploadResponse) => {
          this.isUploading.set(false);
          this.uploadProgress.set(0);

          this._currentMedia.set({ id: result.id, url: result.url });

          // Replace local blob with the server URL
          this.revokeLocalPreview();
          this.fileName.set(null);
          this.lastFile.set(null);

          this.uploaded.emit(result);
        },
        error: (err) => {
          this.isUploading.set(false);
          this.uploadProgress.set(0);
          this._uploadError.set(
            err?.error?.message ?? 'Échec de l\'envoi. Réessayez.',
          );
        },
      });
  }

  protected retry(): void {
    const file = this.lastFile();
    if (!file) return;
    this.performUpload(file);
  }

  // ─── Clear ────────────────────────────────────────────────

  protected clear(event: MouseEvent): void {
    event.stopPropagation();
    if (this.disabled()) return;

    // Best-effort delete on the backend
    const current = this._currentMedia();
    if (current?.id) {
      this.mediaService
        .delete(current.id)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          error: (err) => console.warn('[ImageUploader] delete failed', err),
        });
    }

    this.revokeLocalPreview();
    this._currentMedia.set(null);
    this.fileName.set(null);
    this.lastFile.set(null);
    this._validationError.set(null);
    this._uploadError.set(null);

    this.cleared.emit();
  }

  // ─── Helpers ──────────────────────────────────────────────

  private revokeLocalPreview(): void {
    const url = this._localPreviewUrl();
    if (url) URL.revokeObjectURL(url);
    this._localPreviewUrl.set(null);
  }
}
