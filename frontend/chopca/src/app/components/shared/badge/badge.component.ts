import { Component, ChangeDetectionStrategy, computed, input } from '@angular/core';
import { IconComponent } from '@components/shared/icon/icon.component';

export type BadgeVariant =
  | 'primary'    // terracotta — "Spécialité Maison"
  | 'secondary'  // green — "Vérifié", "100% Végétarien"
  | 'tertiary'   // burnt orange — "Top Vendeur", "Coup de Cœur"
  | 'neutral'    // gray — "Nouveau", "Authentique"
  | 'danger';    // red — allergens, "Épuisé"

export type BadgeSize = 'sm' | 'md';

/**
 * Small pill-shaped label used for status, trust, and category markers.
 *
 * Variants map to the design system's semantic colors:
 * - primary   → brand accent (spécialité, promotions)
 * - secondary → trust/verification (vérifié, certifié)
 * - tertiary  → recognition (top vendeur, coup de cœur)
 * - neutral   → informational (nouveau, tags)
 * - danger    → warning (allergènes, épuisé)
 *
 * Truncation:
 *   [truncate]="true" caps the label to a single line with an ellipsis.
 *   Combine with [maxWidth]="'150px'" to bound the width.
 *   The full text is available via the native [title] tooltip when set
 *   on the host element by the caller.
 *
 * Usage:
 *   <app-badge variant="secondary" icon="verified">Vérifié</app-badge>
 *   <app-badge variant="tertiary" icon="workspace_premium" [filledIcon]="true" [uppercase]="true">
 *     Top Vendeur
 *   </app-badge>
 *   <app-badge [truncate]="true" [maxWidth]="'150px'" [title]="longName">
 *     {{ longName }}
 *   </app-badge>
 */
@Component({
  selector: 'app-badge',
  standalone: true,
  imports: [IconComponent],
  templateUrl: './badge.component.html',
  styleUrl: './badge.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BadgeComponent {

  // ─── Inputs ───────────────────────────────────────────────
  readonly variant = input<BadgeVariant>('neutral');
  readonly size = input<BadgeSize>('md');
  readonly icon = input<string | null>(null);
  readonly filledIcon = input<boolean>(false);
  readonly uppercase = input<boolean>(false);

  /** Cap the label to a single line with ellipsis. */
  readonly truncate = input<boolean>(false);

  /** Optional max width (e.g. '150px', '12rem'). Only applies with truncate=true. */
  readonly maxWidth = input<string | null>(null);

  // ─── Derived classes ──────────────────────────────────────

  /** Full class string for the host `<span>`. */
  readonly classes = computed(() => [
    // Base
    'inline-flex items-center gap-1.5',
    'font-label font-semibold rounded-full leading-none',
    'transition-colors duration-150',
    // Width / overflow — overflow-hidden clips past the max-width
    this.truncate() ? 'overflow-hidden whitespace-nowrap' : 'whitespace-nowrap',
    // Size
    this.size() === 'sm'
      ? 'px-2 py-0.5 text-[10px] tracking-[0.03em]'
      : 'px-3 py-1.5 text-[11px] tracking-[0.02em]',
    // Variant
    ...this.variantClasses(),
    // Uppercase
    this.uppercase() ? 'uppercase' : '',
  ].filter(Boolean).join(' '));

  private variantClasses(): string[] {
    switch (this.variant()) {
      case 'primary':
        return ['bg-primary-fixed', 'text-on-primary-fixed'];
      case 'secondary':
        return ['bg-secondary-container', 'text-on-secondary-container'];
      case 'tertiary':
        return ['bg-tertiary-fixed', 'text-on-tertiary-fixed'];
      case 'danger':
        return ['bg-error-container', 'text-on-error-container'];
      case 'neutral':
      default:
        return ['bg-surface-container-highest', 'text-on-surface'];
    }
  }
}
