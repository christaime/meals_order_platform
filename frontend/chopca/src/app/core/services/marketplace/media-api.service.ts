import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpEvent, HttpEventType, HttpRequest } from '@angular/common/http';
import { Observable, filter, map } from 'rxjs';

import { MediaService } from './media.service';
import {
  Media,
  MediaPurpose,
  MediaUploadResponse,
} from '@app/core/models/marketplace';
import { environment } from '@environments/environment';

/**
 * Real implementation of MediaService.
 * Talks to /api/v1/media through the gateway.
 */
@Injectable()
export class MediaApiService implements MediaService {

  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/media`;

  upload(
    file: File,
    purpose: MediaPurpose,
    onProgress?: (percent: number) => void,
  ): Observable<MediaUploadResponse> {

    const form = new FormData();
    form.append('file', file);
    form.append('purpose', purpose);

    const req = new HttpRequest('POST', this.baseUrl, form, {
      reportProgress: true,
    });

    return this.http.request<MediaUploadResponse>(req).pipe(
      filter((event: HttpEvent<MediaUploadResponse>) => {
        // Emit progress events and the final response — drop the rest
        switch (event.type) {
          case HttpEventType.UploadProgress:
            if (event.total && onProgress) {
              onProgress(Math.round((event.loaded / event.total) * 100));
            }
            return false;
          case HttpEventType.Response:
            return true;
          default:
            return false;
        }
      }),
      map((event: HttpEvent<MediaUploadResponse>) => {
        const res = (event as any).body as MediaUploadResponse;
        if (onProgress) onProgress(100);
        return res;
      }),
    );
  }

  getById(id: string): Observable<Media> {
    return this.http.get<Media>(`${this.baseUrl}/${id}`);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
