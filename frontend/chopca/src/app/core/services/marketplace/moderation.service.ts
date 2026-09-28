import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import {
  ModerationDataResponse,
  ModerationOutcome,
  ModerationRequest,
} from '@app/core/models/marketplace/moderation.model';
import { ModerationTargetType } from '@app/core/models/marketplace/enum-type.model';

export abstract class ModerationService {

  /** Unified decision endpoint. */
  abstract moderate(
    targetType: ModerationTargetType,
    targetId: string,
    request: ModerationRequest,
  ): Observable<ModerationOutcome>;

  /** Full audit trail for a target, newest first. */
  abstract getHistory(
    targetType: ModerationTargetType,
    targetId: string,
  ): Observable<ModerationDataResponse[]>;

  /** Latest action only. */
  abstract getLatest(
    targetType: ModerationTargetType,
    targetId: string,
  ): Observable<ModerationDataResponse>;
}

export const MODERATION_SERVICE = new InjectionToken<ModerationService>('ModerationService');
