import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { LogoComponent } from '@components/shared/logo/logo.component';
import { IconComponent } from '@components/shared/icon/icon.component';

interface FooterLink {
  /** Translation key, resolved by the pipe in the template. */
  readonly key: string;
  /** Destination. Internal routes use `route`, external links use `href`. */
  readonly route?: string;
  readonly href?: string;
}

interface FooterColumn {
  readonly titleKey: string;
  readonly links: readonly FooterLink[];
}

interface SocialLink {
  readonly icon: string;
  readonly href: string;
  readonly ariaLabelKey: string;
}

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterLink, LogoComponent, IconComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.scss',
})
export class FooterComponent {

  private readonly translate = inject(TranslateService);

  readonly currentYear = signal(new Date().getFullYear());

  /**
   * Pre-resolved copyright line. Uses instant() because we need the
   * string in the component (for interpolation with a dynamic year),
   * not just a pipe in the template. Recomputes when either the year
   * signal or the active language changes.
   */
  readonly copyright = computed(() => {
    // Touch the language signal so the computed re-evaluates on switch.
    this.translate.currentLang();
    return this.translate.instant('footer.bottom.copyright', {
      year: this.currentYear(),
    });
  });

  readonly columns: readonly FooterColumn[] = [
    {
      titleKey: 'footer.columns.discover.title',
      links: [
        { key: 'footer.columns.discover.links.exploreMeals', route: '/meals' },
        { key: 'footer.columns.discover.links.vendors',      route: '/meals/vendor/directory' },
        { key: 'footer.columns.discover.links.howItWorks',   route: '/comment-ca-marche' },
      ],
    },
    {
      titleKey: 'footer.columns.vendors.title',
      links: [
        { key: 'footer.columns.vendors.links.becomePartner', href: '/vendor/register' },
        { key: 'footer.columns.vendors.links.vendorSpace',   route: '/vendor/dashboard' },
        { key: 'footer.columns.vendors.links.pricing',       route: '/tarifs' },
      ],
    },
    {
      titleKey: 'footer.columns.support.title',
      links: [
        { key: 'footer.columns.support.links.helpCenter', route: '/aide' },
        { key: 'footer.columns.support.links.whatsapp',   href: 'https://wa.me/237600000000' },
        { key: 'footer.columns.support.links.contact',    route: '/contact' },
      ],
    },
  ];

  /*readonly socialLinks: readonly SocialLink[] = [
    { icon: 'facebook',  href: 'https://facebook.com/chopca',  ariaLabelKey: 'footer.social.facebook'  },
    { icon: 'instagram', href: 'https://instagram.com/chopca', ariaLabelKey: 'footer.social.instagram' },
    { icon: 'tiktok',    href: 'https://tiktok.com/@chopca',   ariaLabelKey: 'footer.social.tiktok'    },
  ];*/
   readonly socialLinks: readonly SocialLink[] = [
      { icon: 'chat', ariaLabelKey: 'footer.social.whatsapp' , href: `https://wa.me/?text=${encodeURIComponent('Découvrez MealMarket : ' + window.location.origin)}` },
      { icon: 'photo_camera', ariaLabelKey: 'footer.social.instagram' , href: 'https://www.instagram.com/' },
      { icon: 'videocam', ariaLabelKey: 'footer.social.tiktok' ,    href: 'https://www.tiktok.com/'},
    ];

  protected taglineKey = 'footer.tagline';
}
