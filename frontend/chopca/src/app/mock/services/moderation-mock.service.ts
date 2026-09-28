import { Injectable, inject } from '@angular/core';
import { Observable, delay, map, of, switchMap, throwError } from 'rxjs';
import { ModerationService } from '@app/core/services/marketplace/moderation.service';
import { CATEGORY_SERVICE } from '@app/core/services/marketplace/category.service';
import {
  ModerationDataResponse,
  ModerationDecision,
  ModerationOutcome,
  ModerationRequest,
} from '@app/core/models/marketplace/moderation.model';
import {
  ModerationStatus,
  ModerationTargetType,
  UserType,
} from '@app/core/models/marketplace/enum-type.model';

/** Simulated 409-style error so components can test the invalid-transition path. */
class ModerationConflictError extends Error {
  readonly status = 409;
}

/** Simulated 400-style error for missing reason. */
class ModerationBadRequestError extends Error {
  readonly status = 400;
}

@Injectable({ providedIn: 'root' })
export class ModerationMockService extends ModerationService {

  private readonly categoryService = inject(CATEGORY_SERVICE);

  /** History log keyed by `${targetType}:${targetId}`. */
  private readonly history = new Map<string, ModerationDataResponse[]>();

  /** Fake admin identity for the audit trail. */
  private readonly fakeAdminId = '00000000-0000-0000-0000-00000000a1a1';

  // ─── Public API ───────────────────────────────────────────

  override moderate(
    targetType: ModerationTargetType,
    targetId: string,
    request: ModerationRequest,
  ): Observable<ModerationOutcome> {
    return this.readCurrentStatus(targetType, targetId).pipe(
      switchMap(currentStatus => {
        const { toStatus } = this.resolveTransition(currentStatus, request);
        return this.writeNewStatus(targetType, targetId, toStatus).pipe(
          map(() => {
            const outcome = this.recordAction(
              targetType,
              targetId,
              currentStatus,
              toStatus,
              request.reason ?? null,
            );
            return this.toOutcome(outcome);
          }),
        );
      }),
      delay(300),
    );
  }

  override getHistory(
    targetType: ModerationTargetType,
    targetId: string,
  ): Observable<ModerationDataResponse[]> {
    const entries = this.history.get(this.key(targetType, targetId)) ?? [];
    // Newest first, per the backend contract.
    return of([...entries].reverse()).pipe(delay(200));
  }

  override getLatest(
    targetType: ModerationTargetType,
    targetId: string,
  ): Observable<ModerationDataResponse> {
    const entries = this.history.get(this.key(targetType, targetId)) ?? [];
    if (entries.length === 0) {
      return throwError(() => ({ status: 404 })).pipe(delay(200));
    }
    return of(entries[entries.length - 1]).pipe(delay(200));
  }

  // ─── Internals ────────────────────────────────────────────

  private key(type: ModerationTargetType, id: string): string {
    return `${type}:${id}`;
  }

  /**
   * Reads the current status of the target. Only CATEGORY is supported for now
   * because that's the only consumer. Extend with a switch on `targetType` when
   * meals/ingredients/locations get their own mock stores.
   */
  private readCurrentStatus(
    targetType: ModerationTargetType,
    targetId: string,
  ): Observable<ModerationStatus> {
    if (targetType !== 'CATEGORY') {
      return throwError(() => ({
        status: 501,
        message: `Mock: moderation of ${targetType} is not implemented yet.`,
      }));
    }
    return this.categoryService.getCategoryById(targetId).pipe(
      map(c => c.status),
    );
  }

  /**
   * Writes the new status back to the target. Same extensibility note as above.
   * The `Partial<CategoryRequest>` cast is because the abstract `CategoryService`
   * declares `Partial<CategoryRequest>` and `status` isn't on `CategoryRequest`
   * (yet). If you add `status?: ModerationStatus` to `CategoryRequest`, drop the
   * cast.
   */
  private writeNewStatus(
    targetType: ModerationTargetType,
    targetId: string,
    toStatus: ModerationStatus,
  ): Observable<unknown> {
    if (targetType !== 'CATEGORY') {
      return throwError(() => ({
        status: 501,
        message: `Mock: moderation of ${targetType} is not implemented yet.`,
      }));
    }
    return this.categoryService.updateCategory(
      targetId,
      { status: toStatus } as never,
    );
  }

  /**
   * Maps a request to a target status, or throws the appropriate error if the
   * transition is not allowed from the current status.
   */
  private resolveTransition(
    from: ModerationStatus,
    request: ModerationRequest,
  ): { toStatus: ModerationStatus } {
    const { decision, reason } = request;

    const requiresReason: readonly ModerationDecision[] = ['REJECT', 'DISABLE', 'REVOKE'];
    if (requiresReason.includes(decision) && !reason?.trim()) {
      throw new ModerationBadRequestError('A reason is required for this decision.');
    }

    const allowed: Record<ModerationStatus, readonly ModerationDecision[]> = {
      PENDING:  ['APPROVE', 'REJECT'],
      APPROVED: ['DISABLE', 'REVOKE'],
      DISABLED: ['REACTIVATE'],
      REJECTED: [],
    };

    if (!allowed[from].includes(decision)) {
      throw new ModerationConflictError(
        `Invalid transition: cannot ${decision} from ${from}.`,
      );
    }

    const toStatus: ModerationStatus = (() => {
      switch (decision) {
        case 'APPROVE':
        case 'REACTIVATE': return 'APPROVED';
        case 'REJECT':     return 'REJECTED';
        case 'DISABLE':    return 'DISABLED';
        case 'REVOKE':     return 'PENDING';
      }
    })();

    return { toStatus };
  }

  /**
   * Appends a record to the audit log and returns the created entry.
   * Seeds an initial `PENDING` entry the first time a target is touched,
   * mirroring `ModerationData.created(...)` on the backend.
   */
  private recordAction(
    targetType: ModerationTargetType,
    targetId: string,
    fromStatus: ModerationStatus,
    toStatus: ModerationStatus,
    reason: string | null,
  ): ModerationDataResponse {
    const k = this.key(targetType, targetId);
    const entries = this.history.get(k) ?? [];

    // Seed a synthetic creation entry once, so getHistory isn't empty before
    // the first real transition.
    if (entries.length === 0) {
      entries.push({
        id: this.uuid(),
        targetType,
        targetId,
        fromStatus: null,
        toStatus: 'PENDING',
        reason: 'Entity created',
        performedByType: 'SYSTEM',
        performedById: this.fakeAdminId,
        performedAt: new Date(Date.now() - 60_000).toISOString(),
      });
    }

    const entry: ModerationDataResponse = {
      id: this.uuid(),
      targetType,
      targetId,
      fromStatus,
      toStatus,
      reason,
      performedByType: 'ADMIN' as UserType,
      performedById: this.fakeAdminId,
      performedAt: new Date().toISOString(),
    };
    entries.push(entry);
    this.history.set(k, entries);
    return entry;
  }

  private toOutcome(entry: ModerationDataResponse): ModerationOutcome {
    return {
      targetType: entry.targetType,
      targetId: entry.targetId,
      // The outcome record's fromStatus is non-nullable, but the first
      // moderation call always follows a seeded PENDING entry, so this holds.
      fromStatus: entry.fromStatus ?? 'PENDING',
      toStatus: entry.toStatus,
      performedByType: entry.performedByType,
      performedById: entry.performedById,
      performedAt: entry.performedAt,
    };
  }

  private uuid(): string {
    // crypto.randomUUID is available in all modern browsers.
    return crypto.randomUUID();
  }
}
