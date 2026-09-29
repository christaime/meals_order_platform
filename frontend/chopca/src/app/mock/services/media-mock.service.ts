import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';

import { MediaService } from '@app/core/services/marketplace/media.service';
import {
  Media,
  MediaPurpose,
  MediaUploadResponse,
} from '@app/core/models/marketplace';

/**
 * Mock implementation of MediaService.
 *
 * Uses URL.createObjectURL() so the browser can display the picked
 * file immediately — the whole upload flow works end-to-end in dev
 * without a backend.
 */
@Injectable()
export class MediaMockService implements MediaService {

  private readonly media = new Map<string, Media>();
  private readonly latency = 400;

  upload(
    file: File,
    purpose: MediaPurpose,
    onProgress?: (percent: number) => void,
  ): Observable<MediaUploadResponse> {

    // Simulate progress: 0 → 100 in ~5 steps
    if (onProgress) {
      [0, 20, 40, 60, 80, 100].forEach((p, i) => {
        setTimeout(() => onProgress(p), i * 80);
      });
    }

    const id = `mock-${crypto.randomUUID()}`;
    const storageRef = id;
    const previewUrl = URL.createObjectURL(file);
    const now = new Date().toISOString();

    const response: MediaUploadResponse = {
      storageRef,
      purpose,
      url: previewUrl,
      size: file.size,
      mimeType: file.type,
      width: null,
      height: null,
      createdAt: now,
    };

    // Keep it in the mock store for getById()
    this.media.set(id, {
      id,
      purpose,
      url: previewUrl,
      size: file.size,
      mimeType: file.type,
      width: null,
      height: null,
      status: 'PENDING',
      createdAt: now,
      updatedAt: now,
    });

    return of(response).pipe(delay(this.latency));
  }

  getById(id: string): Observable<Media> {
    const found = this.media.get(id);
    if (!found) {
      return throwError(() => new Error(`Media not found: ${id}`))
        .pipe(delay(this.latency));
    }
    return of(found).pipe(delay(this.latency));
  }

  delete(id: string): Observable<void> {
    const existing = this.media.get(id);
    if (existing?.url?.startsWith('blob:')) {
      URL.revokeObjectURL(existing.url);
    }
    this.media.delete(id);
    return of(void 0).pipe(delay(this.latency));
  }
}
