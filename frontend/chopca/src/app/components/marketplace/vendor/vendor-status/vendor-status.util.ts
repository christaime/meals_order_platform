import { BadgeVariant } from '@components/shared/badge/badge.component';
import { VendorStatus } from '@app/core/models/marketplace/enum-type.model';

/**
 * Single source of truth for how a VendorStatus is rendered.
 *
 * Vendor statuses are a different enum from ModerationStatus —
 * ACTIVE / PENDING / SUSPENDED / BANNED / INACTIVE, not the
 * PENDING / APPROVED / REJECTED / DISABLED set. Hence this
 * dedicated helper rather than reusing `moderation-status.util`.
 */

export function vendorStatusVariant(s: VendorStatus): BadgeVariant {
  switch (s) {
    case 'ACTIVE':    return 'secondary';
    case 'PENDING':   return 'tertiary';
    case 'SUSPENDED': return 'danger';
    case 'BANNED':    return 'danger';
    case 'INACTIVE':  return 'neutral';
  }
}

export function vendorStatusLabel(s: VendorStatus): string {
  switch (s) {
    case 'ACTIVE':    return 'Actif';
    case 'PENDING':   return 'En attente';
    case 'SUSPENDED': return 'Suspendu';
    case 'BANNED':    return 'Banni';
    case 'INACTIVE':  return 'Inactif';
  }
}

export function vendorStatusIcon(s: VendorStatus): string {
  switch (s) {
    case 'ACTIVE':    return 'check_circle';
    case 'PENDING':   return 'hourglass_top';
    case 'SUSPENDED': return 'pause_circle';
    case 'BANNED':    return 'block';
    case 'INACTIVE':  return 'visibility_off';
  }
}

/** Terminal status — no further transitions possible. */
export function isTerminalVendorStatus(s: VendorStatus): boolean {
  return s === 'BANNED';
}
