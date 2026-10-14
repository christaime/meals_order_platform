import {
  ChangeDetectionStrategy, Component, computed, inject, input, output, signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { IconComponent } from '@components/shared/icon/icon.component';
import { BadgeComponent, BadgeVariant } from '@components/shared/badge/badge.component';
import { MODERATION_SERVICE } from '@app/core/services/marketplace/moderation.service';
import {
  ModerationDataResponse, ModerationDecision, ModerationRequest,
} from '@app/core/models/marketplace/moderation.model';
import {
  ModerationStatus, ModerationTargetType, UserType,
} from '@app/core/models/marketplace/enum-type.model';

interface DecisionDef {
  readonly value: ModerationDecision;
  readonly labelKey: string;
  readonly icon: string;
  readonly variant: 'primary' | 'secondary' | 'danger' | 'neutral';
  readonly requiresReason: boolean;
  readonly confirmTextKey: string;
}

@Component({
  selector: 'app-moderation-panel',
  standalone: true,
  imports: [FormsModule, IconComponent, BadgeComponent, TranslatePipe],
  templateUrl: './moderation-panel.component.html',
  styleUrl: './moderation-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModerationPanelComponent {

  private readonly moderationService = inject(MODERATION_SERVICE);

  // ─── Inputs ────────────────────────────────────────────────
  readonly targetType = input.required<ModerationTargetType>();
  readonly targetId = input.required<string>();
  readonly currentStatus = input.required<ModerationStatus>();
  readonly disabled = input<boolean>(false);

  // ─── Outputs ───────────────────────────────────────────────
  /** Emitted with the fresh outcome after a successful moderation. */
  readonly moderated = output<ModerationDataResponse | null>();

  protected readonly reason = signal<string>('');
  protected readonly busy = signal<boolean>(false);
  /** Key, not a resolved string. Piped in the template. */
  protected readonly errorKey = signal<string | null>(null);
  protected readonly latest = signal<ModerationDataResponse | null>(null);

  protected readonly decisions = computed<readonly DecisionDef[]>(() => {
    switch (this.currentStatus()) {
      case 'PENDING':
        return [
          { value: 'APPROVE', labelKey: 'moderationPanel.decision.APPROVE.label', icon: 'check_circle', variant: 'secondary', requiresReason: false, confirmTextKey: 'moderationPanel.decision.APPROVE.confirm' },
          { value: 'REJECT',  labelKey: 'moderationPanel.decision.REJECT.label',  icon: 'cancel',       variant: 'danger',    requiresReason: true,  confirmTextKey: 'moderationPanel.decision.REJECT.confirm' },
        ];
      case 'APPROVED':
        return [
          { value: 'DISABLE', labelKey: 'moderationPanel.decision.DISABLE.label', icon: 'visibility_off', variant: 'neutral',   requiresReason: true, confirmTextKey: 'moderationPanel.decision.DISABLE.confirm' },
          { value: 'REVOKE',  labelKey: 'moderationPanel.decision.REVOKE.label',  icon: 'undo',           variant: 'primary',   requiresReason: true, confirmTextKey: 'moderationPanel.decision.REVOKE.confirm' },
        ];
      case 'DISABLED':
        return [
          { value: 'REACTIVATE', labelKey: 'moderationPanel.decision.REACTIVATE.label', icon: 'visibility', variant: 'secondary', requiresReason: false, confirmTextKey: 'moderationPanel.decision.REACTIVATE.confirm' },
        ];
      case 'REJECTED':
      default:
        return [];
    }
  });

  protected readonly hasDecisions = computed(() => this.decisions().length > 0);

  protected readonly statusVariant = computed<BadgeVariant>(() => {
    switch (this.currentStatus()) {
      case 'APPROVED': return 'secondary';
      case 'PENDING':  return 'tertiary';
      case 'REJECTED': return 'danger';
      case 'DISABLED': return 'neutral';
    }
  });

  protected readonly statusLabelKey = computed(() => {
    switch (this.currentStatus()) {
      case 'APPROVED': return 'moderationStatus.approved';
      case 'PENDING':  return 'moderationStatus.pending';
      case 'REJECTED': return 'moderationStatus.rejected';
      case 'DISABLED': return 'moderationStatus.disabled';
    }
  });

  protected readonly reasonRequired = computed(() =>
    this.decisions().some(d => d.requiresReason),
  );

  protected submit(decision: DecisionDef): void {
    if (this.busy() || this.disabled()) return;

    if (decision.requiresReason && !this.reason().trim()) {
      this.errorKey.set('moderationPanel.reasonRequired');
      return;
    }

    this.busy.set(true);
    this.errorKey.set(null);

    const payload: ModerationRequest = {
      decision: decision.value,
      ...(decision.requiresReason ? { reason: this.reason().trim() } : {}),
    };

    this.moderationService
      .moderate(this.targetType(), this.targetId(), payload)
      .subscribe({
        next: () => {
          this.busy.set(false);
          this.reason.set('');
          this.refreshLatest();
        },
        error: err => {
          this.busy.set(false);
          this.errorKey.set(
            err?.status === 409
              ? 'moderationPanel.invalidTransition'
              : 'moderationPanel.moderationFailed',
          );
        },
      });
  }

  private refreshLatest(): void {
    this.moderationService
      .getLatest(this.targetType(), this.targetId())
      .subscribe({
        next: data => {
          this.latest.set(data);
          this.moderated.emit(data);
        },
        error: () => {
          this.latest.set(null);
          this.moderated.emit(null);
        },
      });
  }

  protected actorLabelKey(type: UserType): string {
    switch (type) {
      case 'ADMIN':    return 'moderationPanel.actor.ADMIN';
      case 'SYSTEM':   return 'moderationPanel.actor.SYSTEM';
      case 'VENDOR':   return 'moderationPanel.actor.VENDOR';
      case 'CUSTOMER': return 'moderationPanel.actor.CUSTOMER';
    }
  }

  protected shortId(id: string): string {
    return id.length > 8 ? `…${id.slice(-8)}` : id;
  }

  protected formatDate(iso: string): string {
    return new Date(iso).toLocaleString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }
}
