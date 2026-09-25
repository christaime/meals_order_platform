import {
  Component,
  ChangeDetectionStrategy,
  signal, computed,
  input,
  output,
  HostListener,
  inject
} from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { IconComponent } from '@components/shared/icon/icon.component';
import { LogoComponent } from '@components/shared/logo/logo.component';
import { BadgeComponent } from '@components/shared/badge/badge.component';
import { Router } from '@angular/router';
import { AuthIntentStore, AuthIntent } from '@core/storage/auth-intent';
import { UserContextService } from '@core/services/auth';

interface NavItem {
  readonly label: string;
  readonly route: string;
  readonly exact: boolean;
}

interface CurrentUser {
  readonly name: string;
  readonly location: string;
  readonly initials: string;
  readonly userType: 'CUSTOMER' | 'VENDOR' | 'ADMIN';
}

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    RouterLink,
    RouterLinkActive,
    IconComponent,
    LogoComponent,
    BadgeComponent,
  ],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderComponent {

  private readonly userContext = inject(UserContextService);
  // ─── Component Inputs & Outputs ─────────────────────────
  readonly cartCount = input<number>(0);
  readonly toggleCart = output<void>();

  // ─── UI State Signals ───────────────────────────────────
  readonly isAuthenticated = signal<boolean>(false); // Controlled by Auth Service
  readonly mobileMenuOpen = signal<boolean>(false);
  readonly languageOpen = signal<boolean>(false);
  readonly profileOpen = signal<boolean>(false);
  readonly currentLanguage = signal<'FR' | 'EN'>('FR');

  readonly currentUser = computed<CurrentUser>(() => {
      const ctx = this.userContext.context();
      let user: CurrentUser = {
                    name: '',
                    location: '',
                    initials: '',
                    userType: 'CUSTOMER',
                  };
      if (!ctx) return user;
      // derive name/initials from ctx.vendor or ctx.customer
      if(ctx.vendor){}
      return user;
  });
  // ─── Static Data ────────────────────────────────────────
  readonly navItems: readonly NavItem[] = [
    { label: 'Explorer les plats', route: '/meals', exact: true },
    { label: 'Restaurants partenaires', route: '/vendor', exact: false },
    { label: 'Comment ça marche', route: '/comment-ca-marche', exact: false },
  ];

  protected readonly labels = {
    login: 'Se connecter',
    vendor: 'Je Cook!',
    customer: 'Je Chop!',
  } as const;

  readonly languages: readonly ('FR' | 'EN')[] = ['FR', 'EN'];

  private readonly router = inject(Router);

  /**
   * Set the intent and navigate to the login page.
   * The login page (or the Keycloak redirect it triggers) reads the intent
   * on the way back and routes the user to the correct wizard.
   */
  protected startRegistration(intent: AuthIntent): void {
    AuthIntentStore.set(intent);
    this.closeAllDropdowns();
    void this.router.navigate(['/auth/login']);
  }
  // ─── Actions ────────────────────────────────────────────

  onToggleCart(): void {
    this.closeAllDropdowns();
    this.toggleCart.emit();
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen.update((v) => !v);
    this.languageOpen.set(false);
    this.profileOpen.set(false);
  }

  toggleLanguageDropdown(event: MouseEvent): void {
    event.stopPropagation();
    this.languageOpen.update((v) => !v);
    this.profileOpen.set(false);
    this.mobileMenuOpen.set(false);
  }

  toggleProfileDropdown(event: MouseEvent): void {
    event.stopPropagation();
    this.profileOpen.update((v) => !v);
    this.languageOpen.set(false);
    this.mobileMenuOpen.set(false);
  }

  selectLanguage(lang: 'FR' | 'EN'): void {
    this.currentLanguage.set(lang);
    this.languageOpen.set(false);
  }

  closeAllDropdowns(): void {
    this.languageOpen.set(false);
    this.profileOpen.set(false);
    this.mobileMenuOpen.set(false);
  }

  logout(): void {
    this.isAuthenticated.set(false);
    this.closeAllDropdowns();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.header-dropdown')) {
      this.languageOpen.set(false);
      this.profileOpen.set(false);
    }
  }
}
