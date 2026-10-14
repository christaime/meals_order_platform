import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { LogoComponent, BadgeComponent } from '@components/shared';
import { IconComponent } from '@components/shared/icon/icon.component';

import { WorkspaceService } from '@app/core/services/marketplace/workspace.service';
import {
  NavGroup,
  NavItem,
  NavLink,
} from '@app/core/models/auth/nav-menu.models';
import { KEYCLOAK_SERVICE } from '@core/services/auth/keycloak.service';
import { USER_CONTEXT_SERVICE } from '@core/services/auth';
import { TranslateService } from '@ngx-translate/core';
import { LanguageService } from '@core/services/i18n/language.service';

import { DesktopNavComponent } from './desktop-nav/desktop-nav.component';
import { MobileNavComponent } from './mobile-nav/mobile-nav.component';

/**
 * Application header — used by authenticated areas.
 *
 * Menu and workspace badge follow the current route namespace
 * (WorkspaceService). Profile dropdown links are role-scoped, so a
 * multi-role user always sees all their role-specific shortcuts
 * regardless of which workspace they are browsing.
 *
 * Navigation rendering is delegated to <app-desktop-nav> (xl and up) and
 * <app-mobile-nav> (below xl, behind a hamburger). Both read the same
 * `menu()` signal, so a change to the menu definitions propagates to both.
 */
@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    RouterLink,
    LogoComponent,
    IconComponent,
    BadgeComponent,
    DesktopNavComponent,
    MobileNavComponent,
    TranslatePipe,
  ],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderComponent {

  private readonly workspaceService = inject(WorkspaceService);
  private readonly userContext = inject(USER_CONTEXT_SERVICE);
  private readonly keycloakService = inject(KEYCLOAK_SERVICE);
  readonly language = inject(LanguageService);
  private readonly translate = inject(TranslateService);

  // ─── Auth state ──────────────────────────────────────────
  readonly isAuthenticated = computed<boolean>(() => this.keycloakService.isAuthenticated());

  // ─── Workspace ───────────────────────────────────────────
  readonly workspace = this.workspaceService.workspace;
  readonly isAdminWorkspace = this.workspaceService.isAdminWorkspace;
  readonly isVendorWorkspace = this.workspaceService.isVendorWorkspace;
  readonly isCustomerWorkspace = this.workspaceService.isCustomerWorkspace;

  // ─── Roles ───────────────────────────────────────────────
  readonly isVendor = this.keycloakService.isVendor;
  readonly isAdmin = this.keycloakService.isAdmin;
  readonly isCustomer = this.keycloakService.isCustomer;

  // ─── UI state ────────────────────────────────────────────
  readonly profileOpen = signal<boolean>(false);
  readonly languageOpen = signal<boolean>(false);
  readonly openDropdownIndex = signal<number | null>(null);
  readonly mobileMenuOpen = signal<boolean>(false);

  /** Cart badge count. Wired to a real source later. */
  readonly cartCount = signal<number>(0);

  // ─── Menu (workspace-driven) ─────────────────────────────
  readonly menu = computed<readonly NavItem[]>(() => {
    if (this.isAdminWorkspace())    return ADMIN_MENU;
    if (this.isVendorWorkspace())   return VENDOR_MENU;
    if (this.isCustomerWorkspace()) return CUSTOMER_MENU;
    return PUBLIC_MENU;
  });

  readonly portalLabelKey = computed(() => {
    if (this.isAdminWorkspace())    return 'header.portal.admin';
    if (this.isVendorWorkspace())   return 'header.portal.vendor';
    if (this.isCustomerWorkspace()) return 'header.portal.customer';
    return 'header.portal.marketplace';
  });

  // ─── Cross-workspace switch links ────────────────────────
  protected readonly links = {
    vendor:   { labelKey: 'header.switch.toVendor',   route: '/vendor/meals' },
    customer: { labelKey: 'header.switch.toCustomer', route: '/customer/orders' },
  } as const;

  // ─── Current user ────────────────────────────────────────
  readonly currentUser = computed(() => {
    const ctx = this.userContext.context() ?? null;
    const name = ctx?.name ?? '';
    return {
      name,
      email: ctx?.email,
      initials: this.initialsFrom(name),
    };
  });

  readonly vendorBusinessName = computed(() => {
    const ctx = this.userContext.context() ?? null;
    return ctx?.vendor?.businessName ?? '';
  });

  // ─── Language ────────────────────────────────────────────
  readonly languages = ['FR', 'EN'] as const;

  // ─── Template helpers ────────────────────────────────────
  protected isLink(item: NavItem): item is NavLink {
    return item.kind === 'link';
  }
  protected isGroup(item: NavItem): item is NavGroup {
    return item.kind === 'group';
  }

  // ─── Dropdown control ────────────────────────────────────
  onToggleGroup({ index, event }: { index: number; event: MouseEvent }): void {
    event.stopPropagation();
    this.openDropdownIndex.update(current => (current === index ? null : index));
    this.languageOpen.set(false);
    this.profileOpen.set(false);
  }

  toggleProfileDropdown(event: MouseEvent): void {
    event.stopPropagation();
    this.profileOpen.update(v => !v);
    this.languageOpen.set(false);
    this.openDropdownIndex.set(null);
  }

  toggleMobileMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.mobileMenuOpen.update(v => !v);
    this.openDropdownIndex.set(null);
    this.languageOpen.set(false);
    this.profileOpen.set(false);
  }

  /**
   * Closes the in-header dropdowns (groups, language, profile) and the
   * mobile drawer. Called on navigation, outside click, and Escape.
   *
   * Note: this does *not* get called from `toggleMobileMenu`, which needs
   * to be able to open the drawer. `toggleMobileMenu` resets the other
   * dropdowns explicitly.
   */
  closeAllDropdowns(): void {
    this.openDropdownIndex.set(null);
    this.languageOpen.set(false);
    this.profileOpen.set(false);
    this.mobileMenuOpen.set(false);
  }

  onToggleCart(): void {
    this.closeAllDropdowns();
  }

  selectLanguage(lang: 'FR' | 'EN'): void {
    this.languageOpen.set(false);
    const normalized = lang.toLowerCase() as 'fr' | 'en';
    if (normalized === this.language.current()) return;

    this.language.persist(normalized);
    this.translate.use(normalized);
  }

  logout(): void {
    this.closeAllDropdowns();
    this.keycloakService.logout();
  }

  // ─── Document-level listeners ────────────────────────────
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.header-dropdown') && !target.closest('nav')) {
      this.closeAllDropdowns();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeAllDropdowns();
  }

  // ─── Helpers ─────────────────────────────────────────────
  private initialsFrom(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }
}

// ═══════════════════════════════════════════════════════════════
//  Menu definitions per workspace
// ═══════════════════════════════════════════════════════════════
// header.component.ts (menu constants only — the rest of the class is unchanged)

const PUBLIC_MENU: readonly NavItem[] = [
  { kind: 'link', labelKey: 'header.public.exploreMeals', route: '/meals', exact: true },
  { kind: 'link', labelKey: 'header.public.partnerVendors', route: '/meals/vendor/directory', exact: false },
];

const VENDOR_MENU: readonly NavItem[] = [
  {
    kind: 'group',
    labelKey: 'header.vendorMenu.manageDishes',
    children: [
      { kind: 'link', labelKey: 'header.vendorMenu.dishList', route: '/vendor/meals', icon: 'format_list_bulleted' },
      { kind: 'link', labelKey: 'header.vendorMenu.newDish',  route: '/vendor/meals/new', icon: 'add_circle' },
    ],
  },
  { kind: 'link', labelKey: 'header.vendorMenu.presenceZones', route: '/vendor/locations', icon: 'location_on' },
];

const ADMIN_MENU: readonly NavItem[] = [
  {
    kind: 'group',
    labelKey: 'header.adminMenu.mealCatalog',
    children: [
      { kind: 'link', labelKey: 'header.adminMenu.categories',  route: '/admin/categories',  icon: 'category' },
      { kind: 'link', labelKey: 'header.adminMenu.ingredients', route: '/admin/ingredients', icon: 'grocery' },
      { kind: 'link', labelKey: 'header.adminMenu.meals',       route: '/admin/meals',       icon: 'restaurant_menu' },
    ],
  },
  {
    kind: 'group',
    labelKey: 'header.adminMenu.vendorsAndPlaces',
    children: [
      { kind: 'link', labelKey: 'header.adminMenu.vendors',       route: '/admin/vendors',   icon: 'storefront' },
      { kind: 'link', labelKey: 'header.adminMenu.presenceZones', route: '/admin/locations', icon: 'location_on' },
    ],
  },
];

const CUSTOMER_MENU: readonly NavItem[] = [
  { kind: 'link', labelKey: 'header.customerMenu.exploreMeals', route: '/meals' },
  { kind: 'link', labelKey: 'header.customerMenu.myOrders',     route: '/account/orders' },
  { kind: 'link', labelKey: 'header.customerMenu.myFavorites',  route: '/account/favorites' },
  { kind: 'link', labelKey: 'header.customerMenu.myAccount',    route: '/account' },
];
