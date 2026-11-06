import { Component, ChangeDetectionStrategy } from '@angular/core';
import { IconComponent } from '@components/shared/icon/icon.component';
import { LogoComponent } from '@components/shared';
import { TranslatePipe } from '@ngx-translate/core';

interface RolePillar {
  icon: string;
  eyebrowKey: string;
  titleKey: string;
  bodyKey: string;
  metaIcon: string;
  metaLabelKey: string;
  accent: 'primary' | 'secondary' | 'neutral';
}

@Component({
  selector: 'app-auth-hero-panel',
  standalone: true,
  imports: [IconComponent, LogoComponent, TranslatePipe],
  templateUrl: './auth-hero-panel.component.html',
  styleUrl: './auth-hero-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthHeroPanelComponent {

  protected readonly pillars: RolePillar[] = [
    {
      icon: 'restaurant_menu',
      eyebrowKey: 'authHeroPanel.pillars.gourmets.eyebrow',
      titleKey: 'authHeroPanel.pillars.gourmets.title',
      bodyKey: 'authHeroPanel.pillars.gourmets.body',
      metaIcon: 'electric_moped',
      metaLabelKey: 'authHeroPanel.pillars.gourmets.metaLabel',
      accent: 'primary',
    },
    {
      icon: 'storefront',
      eyebrowKey: 'authHeroPanel.pillars.chefs.eyebrow',
      titleKey: 'authHeroPanel.pillars.chefs.title',
      bodyKey: 'authHeroPanel.pillars.chefs.body',
      metaIcon: 'payments',
      metaLabelKey: 'authHeroPanel.pillars.chefs.metaLabel',
      accent: 'secondary',
    },
    {
      icon: 'security',
      eyebrowKey: 'authHeroPanel.pillars.governance.eyebrow',
      titleKey: 'authHeroPanel.pillars.governance.title',
      bodyKey: 'authHeroPanel.pillars.governance.body',
      metaIcon: 'verified_user',
      metaLabelKey: 'authHeroPanel.pillars.governance.metaLabel',
      accent: 'neutral',
    },
  ];

  protected readonly metrics = [
    { value: '+50 000', labelKey: 'authHeroPanel.metrics.gourmets',   tone: 'primary' as const },
    { value: '340+',    labelKey: 'authHeroPanel.metrics.kitchens',   tone: 'secondary' as const },
    { value: '4.9',     labelKey: 'authHeroPanel.metrics.excellence', tone: 'neutral' as const, stars: true },
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
