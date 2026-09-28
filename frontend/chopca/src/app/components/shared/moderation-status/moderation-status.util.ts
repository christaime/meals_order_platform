import { BadgeVariant } from '@components/shared/badge/badge.component';
import { ModerationStatus } from '@app/core/models/marketplace/enum-type.model';

/**
 * Single source of truth for how a ModerationStatus is rendered.
 *
 * Every table / panel that shows a moderation badge must use these
 * helpers instead of re-implementing the switch. If the visual mapping
 * changes (new status, different variant), it changes here once.
 */

export function moderationVariant(s: ModerationStatus): BadgeVariant {
  switch (s) {
    case 'APPROVED': return 'secondary';
    case 'PENDING':  return 'tertiary';
    case 'REJECTED': return 'danger';
    case 'DISABLED': return 'neutral';
  }
}

export function moderationLabel(s: ModerationStatus): string {
  switch (s) {
    case 'APPROVED': return 'Approuvé';
    case 'PENDING':  return 'En attente';
    case 'REJECTED': return 'Rejeté';
    case 'DISABLED': return 'Désactivé';
  }
}

export function moderationIcon(s: ModerationStatus): string {
  switch (s) {
    case 'APPROVED': return 'check_circle';
    case 'PENDING':  return 'hourglass_top';
    case 'REJECTED': return 'cancel';
    case 'DISABLED': return 'visibility_off';
  }
}

/** True for anything that isn't APPROVED — the "needs attention" set. */
export function isUnapproved(s: ModerationStatus): boolean {
  return s !== 'APPROVED';
}
