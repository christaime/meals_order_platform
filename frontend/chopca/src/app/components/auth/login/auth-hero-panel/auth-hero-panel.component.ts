import { Component, ChangeDetectionStrategy } from '@angular/core';
import { IconComponent } from '@components/shared/icon/icon.component';
import { BadgeComponent } from '@components/shared/badge/badge.component';

interface RolePillar {
  icon: string;
  eyebrow: string;
  title: string;
  body: string;
  metaIcon: string;
  metaLabel: string;
  accent: 'primary' | 'secondary' | 'neutral';
}

@Component({
  selector: 'app-auth-hero-panel',
  standalone: true,
  imports: [IconComponent, BadgeComponent],
  templateUrl: './auth-hero-panel.component.html',
  styleUrl: './auth-hero-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthHeroPanelComponent {

  protected readonly pillars: RolePillar[] = [
    {
      icon: 'restaurant_menu',
      eyebrow: 'Pour les Gourmets',
      title: 'Plaisir & Terroir',
      body: 'Ndolé fumé, Koki soyeux, Bar braisé. Livraison géolocalisée 25-35 min via MoMo & OM.',
      metaIcon: 'electric_moped',
      metaLabel: '25-35 min',
      accent: 'primary',
    },
    {
      icon: 'storefront',
      eyebrow: 'Cuisines & Chefs',
      title: 'Croissance Directe',
      body: 'Vitrine sans frais d\'entrée, gestion des commandes en direct et reversements réguliers J+2.',
      metaIcon: 'payments',
      metaLabel: 'Paiements J+2',
      accent: 'secondary',
    },
    {
      icon: 'security',
      eyebrow: 'Gouvernance',
      title: 'Hygiène & Contrôle',
      body: 'Supervision logistique rigoureuse, contrôle sanitaire des partenaires et sécurité des flux.',
      metaIcon: 'verified_user',
      metaLabel: 'HACCP actif',
      accent: 'neutral',
    },
  ];

  protected readonly metrics = [
    { value: '+50 000', label: 'Gourmets', tone: 'primary' as const },
    { value: '340+',    label: 'Cuisines', tone: 'secondary' as const },
    { value: '4.9',     label: "Avis d'excellence", tone: 'neutral' as const, stars: true },
  ];

  protected pillarIconWrapClass(accent: RolePillar['accent']): string {
    const base = 'w-8 h-8 rounded-lg flex items-center justify-center mb-space-xs';
    switch (accent) {
      case 'primary':   return `${base} bg-primary-fixed text-primary`;
      case 'secondary': return `${base} bg-secondary-fixed text-secondary`;
      case 'neutral':   return `${base} bg-surface-container-high text-on-surface`;
    }
  }

  protected pillarEyebrowClass(accent: RolePillar['accent']): string {
    const base = 'font-label-sm text-label-sm uppercase tracking-wide font-bold';
    switch (accent) {
      case 'primary':   return `${base} text-primary`;
      case 'secondary': return `${base} text-secondary`;
      case 'neutral':   return `${base} text-on-surface-variant`;
    }
  }

  protected metricValueClass(tone: 'primary' | 'secondary' | 'neutral'): string {
    const base = 'font-headline-md text-headline-md font-bold';
    switch (tone) {
      case 'primary':   return `${base} text-primary`;
      case 'secondary': return `${base} text-secondary`;
      case 'neutral':   return `${base} text-on-surface`;
    }
  }
}
