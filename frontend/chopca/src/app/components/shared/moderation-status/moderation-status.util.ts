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

/** Translation key for the status label. Pipe at the render site. */
export function moderationLabelKey(s: ModerationStatus): string {
  switch (s) {
    case 'APPROVED': return 'moderationStatus.approved';
    case 'PENDING':  return 'moderationStatus.pending';
    case 'REJECTED': return 'moderationStatus.rejected';
    case 'DISABLED': return 'moderationStatus.disabled';
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

export function isUnapproved(s: ModerationStatus): boolean {
  return s !== 'APPROVED';
}
