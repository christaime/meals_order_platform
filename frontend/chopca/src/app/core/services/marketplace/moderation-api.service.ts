import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';
import { ModerationService } from './moderation.service';
import {
  ModerationDataResponse,
  ModerationOutcome,
  ModerationRequest,
} from '@app/core/models/marketplace/moderation.model';
import { ModerationTargetType } from '@app/core/models/marketplace/enum-type.model';

@Injectable({ providedIn: 'root' })
export class ModerationApiService extends ModerationService {

  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/admin/moderation`;

  override moderate(
    targetType: ModerationTargetType,
    targetId: string,
    request: ModerationRequest,
  ): Observable<ModerationOutcome> {
    return this.http.post<ModerationOutcome>(
      `${this.base}/${targetType}/${targetId}`,
      request,
    );
  }

  override getHistory(
    targetType: ModerationTargetType,
    targetId: string,
  ): Observable<ModerationDataResponse[]> {
    return this.http.get<ModerationDataResponse[]>(
      `${this.base}/history/${targetType}/${targetId}`,
    );
  }

  override getLatest(
    targetType: ModerationTargetType,
    targetId: string,
  ): Observable<ModerationDataResponse> {
    return this.http.get<ModerationDataResponse>(
      `${this.base}/history/${targetType}/${targetId}/latest`,
    );
  }
}
