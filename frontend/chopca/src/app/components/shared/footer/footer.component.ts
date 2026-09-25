import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '@components/shared/icon/icon.component';
import { LogoComponent } from '@components/shared/logo/logo.component';

interface FooterLink {
  readonly label: string;
  readonly route: string;
}

interface FooterColumn {
  readonly title: string;
  readonly links: readonly FooterLink[];
}

interface SocialLink {
  readonly icon: string;
  readonly label: string;
  readonly href: string;
}

/**
 * Site footer — shared across all public pages.
 *
 * Responsibilities:
 * - Brand block (logo, tagline, social icons)
 * - 3 link columns (À propos, Aide & Support, Contact & Légal)
 * - Bottom bar (copyright + trust badges)
 *
 * Data flow:
 * - Fully static — no inputs, no outputs, no state.
 * - Update the column arrays when nav links change.
 */
@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterLink, IconComponent, LogoComponent],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FooterComponent {

  readonly currentYear = new Date().getFullYear();

  readonly tagline =
    'Mangez local, mangez bon. La première plateforme gastronomique reliant les maîtres braiseurs, mamans cuisinières et gourmets de Douala à Yaoundé.';

  readonly socialLinks: readonly SocialLink[] = [
    { icon: 'chat',         label: 'WhatsApp',  href: '#' },
    { icon: 'share',        label: 'Partager',  href: '#' },
    { icon: 'photo_camera', label: 'Instagram', href: '#' },
    { icon: 'videocam',     label: 'TikTok',    href: '#' },
  ];

  readonly columns: readonly FooterColumn[] = [
    {
      title: 'À propos',
      links: [
        { label: 'Notre histoire',        route: '/notre-histoire' },
        { label: 'Nos chefs partenaires', route: '/nos-chefs-partenaires' },
        { label: 'Engagements qualité',   route: '/engagements-qualite' },
        { label: 'Blog culinaire',        route: '/blog-culinaire' },
      ],
    },
    {
      title: 'Aide & Support',
      links: [
        { label: "Centre d'aide",                       route: '/centre-daide' },
        { label: 'Zones de livraison Douala & Yaoundé', route: '/zones-de-livraison' },
        { label: 'Paiement MTN MoMo / Orange Money',    route: '/moyens-de-paiement' },
        { label: 'FAQ',                                 route: '/faq' },
      ],
    },
    {
      title: 'Contact & Légal',
      links: [
        { label: 'Nous contacter',         route: '/contact' },
        { label: 'Devenir livreur',        route: '/devenir-livreur' },
        { label: 'CGU & Mentions légales', route: '/cgu-mentions-legales' },
        { label: 'Confidentialité',        route: '/confidentialite' },
      ],
    },
  ];
}
