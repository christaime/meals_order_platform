import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '@components/shared/icon/icon.component';
import { LogoComponent } from '@components/shared/logo/logo.component';

interface FooterLink {
  readonly label: string;
  readonly href: string;
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
    'Mangez local, mangez bon. La plateforme gastronomique reliant les maîtres braiseurs, mamans cuisinières et gourmets du Cameroun.';

  readonly socialLinks: readonly SocialLink[] = [
    { icon: 'chat',         label: 'WhatsApp',  href: `https://wa.me/?text=${encodeURIComponent('Découvrez MealMarket : ' + window.location.origin)}` },
    { icon: 'photo_camera', label: 'Instagram', href: 'https://www.instagram.com/' },
    { icon: 'videocam',     label: 'TikTok',    href: 'https://www.tiktok.com/' },
  ];

  readonly columns: readonly FooterColumn[] = [
    {
      title: 'À propos',
      links: [
        { label: 'Notre histoire',        href: '/about' },
        { label: 'Nos chefs partenaires', href: '/meals/vendor/directory' },
      //  { label: 'Engagements qualité',   href: '/engagements-qualite' },
      //  { label: 'Blog culinaire',        href: '/blog-culinaire' },
      ],
    },
    {
      title: 'Aide & Support',
      links: [
        { label: "Centre d'aide",                       href: '/about#help_center' },
       // { label: 'Zones de livraison Douala & Yaoundé', href: '/zones-de-livraison' },
       // { label: 'Paiement MTN MoMo / Orange Money',    href: '/moyens-de-paiement' },
       // { label: 'FAQ',                                 href: '/faq' },
      ],
    },
    {
      title: 'Contact & Légal',
      links: [
        { label: 'Nous contacter',         href: '/about#contact' },
       // { label: 'Devenir livreur',        href: '/devenir-livreur' },
       // { label: 'CGU & Mentions légales', href: '/cgu-mentions-legales' },
       // { label: 'Confidentialité',        href: '/confidentialite' },
      ],
    },
  ];
}
