import {
  Component,
  ChangeDetectionStrategy,
  signal,
  computed,
  inject,
  HostListener
} from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { LogoComponent } from '@components/shared/logo/logo.component';
import { IconComponent } from '@components/shared/icon/icon.component';

import { RoleContext } from '@app/core/services/auth/role-context.service';
import { NavItem, NavGroup, NavLink } from '@app/core/models/auth/nav-menu.models';

/**
 * Application header — used by all authenticated areas (vendor, admin, customer)
 * and by anonymous pages when needed.
 *
 * Responsibilities:
 * - Logo + contextual portal badge
 * - Role-based navigation (menu changes with the user's role)
 * - Language selector (FR / EN)
 * - Notifications bell
 * - Profile dropdown (when authenticated)
 * - Anonymous CTAs (when not authenticated)
 *
 * The header internally resolves the correct menu from the user's role.
 * No `menu` input needed — parents just render `<app-auth-header />`.
 */
@Component({
  selector: 'app-auth-header',
  standalone: true,
  imports: [
    RouterLink,
    RouterLinkActive,
    LogoComponent,
    IconComponent
  ],
  templateUrl: './auth-header.component.html',
  styleUrl: './auth-header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthHeaderComponent {

  private readonly roleContext = inject(RoleContext);

  // ─── UI state ─────────────────────────────────────────────
  readonly languageOpen = signal<boolean>(false);
  readonly profileOpen = signal<boolean>(false);
  readonly openDropdownIndex = signal<number | null>(null);

  readonly currentLanguage = signal<'FR' | 'EN'>('FR');

  // ─── Derived from role ────────────────────────────────────
  readonly isAuthenticated = this.roleContext.isAuthenticated;
  readonly isVendor = this.roleContext.isVendor;
  readonly isAdmin = this.roleContext.isAdmin;
  readonly isCustomer = this.roleContext.isCustomer;

  /**
   * The active nav menu, resolved from the current user's role.
   * Anonymous users get an empty menu.
   */
  readonly menu = computed<readonly NavItem[]>(() => {
    if (this.roleContext.isAdmin()) return ADMIN_MENU;
    if (this.roleContext.isVendor()) return VENDOR_MENU;
    if (this.roleContext.isCustomer()) return CUSTOMER_MENU;
    return [];
  });

  protected readonly links = {
    login: {label : 'Se connecter', route:'/auth/login'},
    vendor: {label : 'Je Cook!', route:'/vendor/dashboard'},
    customer: {label : 'Je Chop!', route:'/customer/dashboard'},
  } as const;
  /**
   * The label of the current user's portal — used in the badge next to the logo.
   */
  readonly portalLabel = computed(() => {
    if (this.roleContext.isAdmin()) return 'Espace Admin';
    if (this.roleContext.isVendor()) return 'Espace Vendeur';
    if (this.roleContext.isCustomer()) return 'Espace Client';
    return 'Marketplace';
  });

  /**
   * The mock user for now (until we wire real claims from the JWT).
   */
  readonly currentUser = signal({
    name: 'Maman Pauline',
    business: 'Le Chaudron Sawa',
    initials: 'MP',
  });

  readonly languages = ['FR', 'EN'] as const;

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.header-dropdown') && !target.closest('nav')) {
      this.closeAllDropdowns();
    }
  }
  // ─── Dropdown control ─────────────────────────────────────

  toggleDropdown(index: number, event: MouseEvent): void {
    event.stopPropagation();
    this.openDropdownIndex.update(current => (current === index ? null : index));
    this.languageOpen.set(false);
    this.profileOpen.set(false);
  }

  closeAllDropdowns(): void {
    this.openDropdownIndex.set(null);
    this.languageOpen.set(false);
    this.profileOpen.set(false);
  }

  toggleLanguageDropdown(event: MouseEvent): void {
    event.stopPropagation();
    this.languageOpen.update(v => !v);
    this.profileOpen.set(false);
    this.openDropdownIndex.set(null);
  }

  toggleProfileDropdown(event: MouseEvent): void {
    event.stopPropagation();
    this.profileOpen.update(v => !v);
    this.languageOpen.set(false);
    this.openDropdownIndex.set(null);
  }

  selectLanguage(lang: 'FR' | 'EN'): void {
    this.currentLanguage.set(lang);
    this.languageOpen.set(false);
  }

  // ─── Helpers (for the template) ───────────────────────────

  isGroup(item: NavItem): item is NavGroup {
    return item.kind === 'group';
  }

  isLink(item: NavItem): item is NavLink {
    return item.kind === 'link';
  }

  // Add to the component class
  logout(): void {
    this.closeAllDropdowns();
    // TODO: integrate with Keycloak when the auth service lands.
    // this.keycloak.logout({ redirectUri: window.location.origin + '/meals' });
  }
}

// ═══════════════════════════════════════════════════════════════
//  Menu definitions per role
// ═══════════════════════════════════════════════════════════════

const VENDOR_MENU: readonly NavItem[] = [
  {
    kind: 'group',
    label: 'Gestion des Plats',
    children: [
      { kind: 'link', label: 'Liste des plats',  route: '/vendor/meals',     icon: 'format_list_bulleted' },
      { kind: 'link', label: 'Édition de plat',  route: '/vendor/meals/new', icon: 'edit' },
    ],
  },
  {
    kind: 'group',
    label: 'Gestion des Commandes',
    children: [
      { kind: 'link', label: 'Commandes en direct',   route: '/vendor/orders', icon: 'receipt_long', badge: { type: 'count', value: 3 } },
      { kind: 'link', label: 'Stocks & Disponibilités', route: '/vendor/stocks', icon: 'inventory_2' },
    ],
  },
  {
    kind: 'link',
    label: 'Statistiques',
    route: '/vendor/stats',
  },
];

const ADMIN_MENU: readonly NavItem[] = [
  { kind: 'link', label: 'Vendeurs',     route: '/admin/vendors' },
  { kind: 'link', label: 'Catégories',   route: '/admin/categories' },
  { kind: 'link', label: 'Ingrédients',  route: '/admin/ingredients' },
  { kind: 'link', label: 'Modération',   route: '/admin/moderation' },
  { kind: 'link', label: 'Paramètres',   route: '/admin/settings' },
];

const CUSTOMER_MENU: readonly NavItem[] = [
  { kind: 'link', label: 'Explorer les plats', route: '/meals' },
  { kind: 'link', label: 'Mes commandes',      route: '/account/orders' },
  { kind: 'link', label: 'Mes favoris',        route: '/account/favorites' },
  { kind: 'link', label: 'Mon compte',         route: '/account' },
];
