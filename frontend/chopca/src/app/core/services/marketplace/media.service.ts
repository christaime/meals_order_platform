import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import {
  Media,
  MediaPurpose,
  MediaUploadResponse,
} from '@app/core/models/marketplace';

/**
 * Abstract contract for the Media service.
 *
 * Single entry point for all file uploads:
 * - Meal images
 * - Vendor logos and banners
 * - ID card scans
 *
 * Components inject MEDIA_SERVICE — never a concrete implementation.
 */
export abstract class MediaService {

  /**
   * Upload a file. Emits upload progress (0–100) via the optional
   * `onProgress` callback, then resolves with the created Media.
   *
   * POST /api/v1/media  (multipart/form-data)
   */
  abstract upload(
    file: File,
    purpose: MediaPurpose,
    onProgress?: (percent: number) => void,
  ): Observable<MediaUploadResponse>;

  /**
   * Fetch media metadata by id.
   * Useful for edit flows where you only stored the media id.
   *
   * GET /api/v1/media/{id}
   */
  abstract getById(id: string): Observable<Media>;

  /**
   * Delete a media file (best-effort — the backend may have
   * already promoted it to USED if it's referenced by an entity).
   *
   * DELETE /api/v1/media/{id}
   */
  abstract delete(id: string): Observable<void>;
}

export const MEDIA_SERVICE = new InjectionToken<MediaService>('MediaService');
