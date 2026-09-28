import { ModerationStatus, ModerationTargetType, UserType } from './enum-type.model';

export type ModerationDecision =
  | 'APPROVE'
  | 'REJECT'
  | 'DISABLE'
  | 'REACTIVATE'
  | 'REVOKE';

export interface ModerationRequest {
  readonly decision: ModerationDecision;
  readonly reason?: string;
}

export interface ModerationOutcome {
  readonly targetType: ModerationTargetType;
  readonly targetId: string;
  readonly fromStatus: ModerationStatus;
  readonly toStatus: ModerationStatus;
  readonly performedByType: UserType;
  readonly performedById: string;
  readonly performedAt: string;
}

export interface ModerationDataResponse {
  readonly id: string;
  readonly targetType: ModerationTargetType;
  readonly targetId: string;
  readonly fromStatus: ModerationStatus | null;
  readonly toStatus: ModerationStatus;
  readonly reason: string | null;
  readonly performedByType: UserType;
  readonly performedById: string;
  readonly performedAt: string;
}
