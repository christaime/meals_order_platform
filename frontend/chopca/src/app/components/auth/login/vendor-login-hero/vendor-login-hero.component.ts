import { Component, ChangeDetectionStrategy } from '@angular/core';
import { IconComponent } from '@components/shared/icon/icon.component';

interface Metric {
  readonly label: string;      // small uppercase label above the value
  readonly value: string;      // big value
  readonly subtext: string;    // small line below
  readonly icon: string;       // Material Symbols name
  readonly tone: 'primary' | 'secondary';
}

interface Testimonial {
  readonly rating: number;              // 5 for now
  readonly badgeLabel: string;          // "Chef Certifié"
  readonly quote: string;
  readonly authorName: string;
  readonly authorRole: string;
  readonly authorImageUrl: string;
  readonly authorInitials: string;
}

/**
 * Left-column hero for the vendor login page.
 *
 * Contains:
 * - Two intro pills (Réseau Chefs / Localisation)
 * - Welcome headline + tagline
 * - 3 metric cards (Paiements / Commandes / Support)
 * - Partner testimonial card with photo, quote, and rating
 *
 * Static content — no inputs, no state. If you later want to A/B test
 * different headlines, promote the content to `input()` signals.
 */
@Component({
  selector: 'app-vendor-login-hero',
  standalone: true,
  imports: [IconComponent],
  templateUrl: './vendor-login-hero.component.html',
  styleUrl: './vendor-login-hero.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VendorLoginHeroComponent {

  readonly metrics: readonly Metric[] = [
    {
      label: 'Paiements',
      value: 'Instantané',
      subtext: '0 frais MoMo/OM',
      icon: 'bolt',
      tone: 'secondary',
    },
    {
      label: 'Commandes',
      value: '+85%',
      subtext: 'Croissance moyenne',
      icon: 'trending_up',
      tone: 'primary',
    },
    {
      label: 'Support Dédié',
      value: '7j / 7',
      subtext: 'Équipe locale 237',
      icon: 'support_agent',
      tone: 'secondary',
    },
  ];

  readonly testimonial: Testimonial = {
    rating: 5,
    badgeLabel: 'Chef Certifié',
    quote:
      "« Chop ça! a complètement transformé la visibilité de mon restaurant. Dès le premier mois, mes commandes de Ndolé royal et de Koki ont doublé chaque week-end à Akwa ! »",
    authorName: 'Maman Pauline Essomba',
    authorRole: 'Fondatrice de « Le Chaudron de Bonanjo », Douala',
    authorImageUrl:
      'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=200',
    authorInitials: 'PE',
  };

  /** Convenience for the template: `[1,2,3,4,5]` for the star row. */
  readonly stars = [1, 2, 3, 4, 5] as const;
}
