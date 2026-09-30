import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { NgClass } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';

import { IconComponent } from '@components/shared/icon/icon.component';
import { BadgeComponent } from '@components/shared/badge/badge.component';
import { ToastService } from '@components/shared/toast';
import {
  vendorStatusIcon,
  vendorStatusLabel,
  vendorStatusVariant,
} from '@components/marketplace/vendor/vendor-status/vendor-status.util';

import { VENDOR_SERVICE } from '@app/core/services/marketplace/vendor.service';
import { Vendor } from '@app/core/models/marketplace';
import { VendorStatus } from '@app/core/models/marketplace/enum-type.model';

/** The four admin state transitions a vendor can undergo. */
type VendorAction = 'ACTIVATE' | 'SUSPEND' | 'BAN' | 'DEACTIVATE';

interface ActionMeta {
  readonly action: VendorAction;
  readonly label: string;
  readonly icon: string;
  readonly requiresReason: boolean;
  /** Warn tone for destructive/terminal actions. */
  readonly destructive: boolean;
}

const ACTIONS: Record<VendorAction, ActionMeta> = {
  ACTIVATE:   { action: 'ACTIVATE',   label: 'Activer',     icon: 'check_circle',   requiresReason: false, destructive: false },
  SUSPEND:    { action: 'SUSPEND',    label: 'Suspendre',   icon: 'pause_circle',   requiresReason: true,  destructive: true  },
  BAN:        { action: 'BAN',        label: 'Bannir',      icon: 'block',          requiresReason: true,  destructive: true  },
  DEACTIVATE: { action: 'DEACTIVATE', label: 'Désactiver',  icon: 'visibility_off', requiresReason: false, destructive: false },
};

/** Valid transitions per current status — mirrors VendorState.canTransitionTo. */
const VALID_ACTIONS: Record<VendorStatus, readonly VendorAction[]> = {
  PENDING:   ['ACTIVATE', 'DEACTIVATE'],
  ACTIVE:    ['SUSPEND', 'BAN', 'DEACTIVATE'],
  SUSPENDED: ['ACTIVATE', 'BAN'],
  BANNED:    [],                       // terminal
  INACTIVE:  ['ACTIVATE'],
};

/**
 * VendorModerationPanelComponent — admin-only.
 *
 * Vendors don't use the ModerationService — their lifecycle is a
 * state machine driven by `/admin/vendors/{id}/activate|suspend|ban|deactivate`.
 * This panel shows only the transitions valid from the vendor's current
 * status, then confirms the action (with a reason where required) before
 * calling the API.
 *
 * The host page owns the selected vendor; this component just reacts.
 */
@Component({
  selector: 'app-vendor-moderation-panel',
  standalone: true,
  imports: [NgClass, FormsModule, IconComponent, BadgeComponent],
  templateUrl: './vendor-moderation-panel.component.html',
  styleUrl: './vendor-moderation-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VendorModerationPanelComponent {

  private readonly vendorService = inject(VENDOR_SERVICE);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  /** The selected vendor. `null` clears the panel. */
  readonly vendorId = input.required<string>();
  readonly businessName = input.required<string>();
  readonly currentStatus = input.required<VendorStatus>();

  /** Emitted with the freshly-updated vendor on a successful transition. */
  readonly moderated = output<Vendor>();

  // ─── Internal state ───────────────────────────────────────
  protected readonly pendingAction = signal<VendorAction | null>(null);
  protected readonly reason = signal<string>('');
  protected readonly submitting = signal<boolean>(false);

  // ─── Derived ──────────────────────────────────────────────
  protected readonly validActions = computed<readonly ActionMeta[]>(() =>
    VALID_ACTIONS[this.currentStatus()].map(a => ACTIONS[a]),
  );

  protected readonly pendingMeta = computed<ActionMeta | null>(() => {
    const a = this.pendingAction();
    return a ? ACTIONS[a] : null;
  });

  protected readonly canConfirm = computed(() => {
    const meta = this.pendingMeta();
    if (!meta) return false;
    if (!meta.requiresReason) return true;
    return this.reason().trim().length >= 3;
  });

  // ─── Helpers exposed to the template ──────────────────────
  protected readonly statusVariant = vendorStatusVariant;
  protected readonly statusLabel   = vendorStatusLabel;
  protected readonly statusIcon    = vendorStatusIcon;

  // ─── Actions ──────────────────────────────────────────────

  protected beginAction(meta: ActionMeta): void {
    this.pendingAction.set(meta.action);
    this.reason.set('');
  }

  protected cancel(): void {
    this.pendingAction.set(null);
    this.reason.set('');
  }

  protected onReasonInput(event: Event): void {
    this.reason.set((event.target as HTMLTextAreaElement).value);
  }

  protected confirm(): void {
    const meta = this.pendingMeta();
    if (!meta || this.submitting()) return;

    this.submitting.set(true);
    const id = this.vendorId();
    const reason = this.reason().trim();

    const call$ =
      meta.action === 'ACTIVATE'   ? this.vendorService.activateVendor(id) :
      meta.action === 'SUSPEND'    ? this.vendorService.suspendVendor(id, reason) :
      meta.action === 'BAN'        ? this.vendorService.banVendor(id, reason) :
                                     this.vendorService.deactivateVendor(id, reason || undefined);

    call$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (updated) => {
        this.submitting.set(false);
        this.pendingAction.set(null);
        this.reason.set('');
        this.toast.show(`${meta.label} — succès`, 'success');
        this.moderated.emit(updated);
      },
      error: (err) => {
        this.submitting.set(false);
        this.toast.show(`Échec de l'action « ${meta.label} »`, 'error');
        console.error('[VendorModerationPanel]', err);
      },
    });
  }
}
