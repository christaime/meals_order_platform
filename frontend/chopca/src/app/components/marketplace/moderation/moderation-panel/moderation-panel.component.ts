import {
  ChangeDetectionStrategy, Component, computed, inject, input, output, signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
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
  readonly label: string;
  readonly icon: string;
  readonly variant: 'primary' | 'secondary' | 'danger' | 'neutral';
  readonly requiresReason: boolean;
  readonly confirmText: string;
}

@Component({
  selector: 'app-moderation-panel',
  standalone: true,
  imports: [FormsModule, IconComponent, BadgeComponent],
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

  // ─── Local state ───────────────────────────────────────────
  protected readonly reason = signal<string>('');
  protected readonly busy = signal<boolean>(false);
  protected readonly error = signal<string | null>(null);
  protected readonly latest = signal<ModerationDataResponse | null>(null);

  /** Decisions allowed from the current status, per backend rules. */
  protected readonly decisions = computed<readonly DecisionDef[]>(() => {
    switch (this.currentStatus()) {
      case 'PENDING':
        return [
          { value: 'APPROVE',    label: 'Approuver',  icon: 'check_circle',      variant: 'secondary', requiresReason: false, confirmText: 'Approuver cette catégorie ?' },
          { value: 'REJECT',     label: 'Rejeter',    icon: 'cancel',            variant: 'danger',    requiresReason: true,  confirmText: 'Rejeter cette catégorie ?' },
        ];
      case 'APPROVED':
        return [
          { value: 'DISABLE',    label: 'Désactiver', icon: 'visibility_off',    variant: 'neutral',   requiresReason: true,  confirmText: 'Désactiver cette catégorie ?' },
          { value: 'REVOKE',     label: 'Réviser',    icon: 'undo',              variant: 'primary',   requiresReason: true,  confirmText: 'Renvoyer cette catégorie en revue ?' },
        ];
      case 'DISABLED':
        return [
          { value: 'REACTIVATE', label: 'Réactiver',  icon: 'visibility',        variant: 'secondary', requiresReason: false, confirmText: 'Réactiver cette catégorie ?' },
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

  protected readonly statusLabel = computed(() => {
    switch (this.currentStatus()) {
      case 'APPROVED': return 'Approuvé';
      case 'PENDING':  return 'En attente';
      case 'REJECTED': return 'Rejeté';
      case 'DISABLED': return 'Désactivé';
    }
  });

  /** True if *any* allowed decision requires a reason. */
  protected readonly reasonRequired = computed(() =>
    this.decisions().some(d => d.requiresReason),
  );

  // ─── Actions ───────────────────────────────────────────────
  protected submit(decision: DecisionDef): void {
    if (this.busy() || this.disabled()) return;

    if (decision.requiresReason && !this.reason().trim()) {
      this.error.set('Un motif est requis pour cette action.');
      return;
    }

    this.busy.set(true);
    this.error.set(null);

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
          this.error.set(
            err?.status === 409
              ? 'Transition invalide depuis le statut actuel.'
              : 'Échec de la modération. Réessayez.',
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
          // No history — first action just happened, nothing else to fetch.
          this.latest.set(null);
          this.moderated.emit(null);
        },
      });
  }

  protected actorLabel(type: UserType): string {
    switch (type) {
      case 'ADMIN': return 'Admin';
      case 'SYSTEM': return 'Système';
      case 'VENDOR': return 'Vendeur';
      case 'CUSTOMER': return 'Client';
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
