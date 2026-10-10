import {
  Component,
  ChangeDetectionStrategy,
  signal,
  computed,
  inject,
  HostListener,
} from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { LogoComponent } from '@components/shared/logo/logo.component';
import { IconComponent } from '@components/shared/icon/icon.component';

import { WorkspaceService } from '@app/core/services/marketplace/workspace.service';
import { UserContextService } from '@app/core/services/auth/user-context.service';
import { NavItem, NavGroup, NavLink } from '@app/core/models/auth/nav-menu.models';
import { KEYCLOAK_SERVICE } from '@core/services/auth/keycloak.service';
import { USER_CONTEXT_SERVICE } from '@core/services/auth';
/**
 * Application header — used by authenticated areas.
 *
 * Menu and workspace badge follow the current route namespace
 * (WorkspaceService), so a user who is both admin and vendor sees the
 * vendor menu while browsing `/vendor/*` and the admin menu while browsing
 * `/admin/*`.
 *
 * The profile dropdown links are role-scoped (RoleContext), so a
 * multi-role user always sees all their role-specific shortcuts
 * regardless of which workspace they are currently browsing.
 *
 * Anonymous CTAs are intentionally absent — this header is only mounted
 * in authenticated layouts.
 */
@Component({
  selector: 'app-auth-header',
  standalone: true,
  imports: [
    RouterLink,
    RouterLinkActive,
    LogoComponent,
    IconComponent,
  ],
  templateUrl: './auth-header.component.html',
  styleUrl: './auth-header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthHeaderComponent {

  private readonly workspaceService = inject(WorkspaceService);
  private readonly userContext = inject(USER_CONTEXT_SERVICE);
  private readonly keycloakService = inject(KEYCLOAK_SERVICE);

  // ─── Workspace (menu + badge) ─────────────────────────────
  readonly workspace = this.workspaceService.workspace;
  readonly isAdminWorkspace = this.workspaceService.isAdminWorkspace;
  readonly isVendorWorkspace = this.workspaceService.isVendorWorkspace;
  readonly isCustomerWorkspace = this.workspaceService.isCustomerWorkspace;

  // ─── Roles (profile dropdown links) ───────────────────────
  readonly isVendor = this.keycloakService.isVendor;
  readonly isAdmin = this.keycloakService.isAdmin;
  readonly isCustomer = this.keycloakService.isCustomer;

  // ─── UI state ─────────────────────────────────────────────
  readonly languageOpen = signal<boolean>(false);
  readonly profileOpen = signal<boolean>(false);
  readonly openDropdownIndex = signal<number | null>(null);

  readonly currentLanguage = signal<'FR' | 'EN'>('FR');

  // ─── Menu by workspace ────────────────────────────────────
  readonly menu = computed<readonly NavItem[]>(() => {
    if (this.isAdminWorkspace())    return ADMIN_MENU;
    if (this.isVendorWorkspace())   return VENDOR_MENU;
    if (this.isCustomerWorkspace()) return CUSTOMER_MENU;
    return [];
  });

  readonly portalLabel = computed(() => {
    if (this.isAdminWorkspace())    return 'Espace Admin';
    if (this.isVendorWorkspace())   return 'Espace Vendeur';
    if (this.isCustomerWorkspace()) return 'Espace Client';
    return 'Marketplace';
  });

  // ─── Cross-workspace switch links ─────────────────────────
  protected readonly links = {
    vendor:   { label: 'Je Cook!', route: '/vendor/dashboard' },
    customer: { label: 'Je Chop!', route: '/customer/dashboard' },
  } as const;

  // ─── Current user (from UserContextService) ───────────────
  /**
   * The signed-in user's display name and derived initials.
   */
  readonly currentUser = computed(() => {
    const ctx = this.userContext.context?.() ?? null;   // ← adjust accessor

    const name =
      ctx?.vendor?.businessName ??
      ctx?.admin?.displayName ??
      ctx?.customer?.displayName ??
      ctx?.email ??
      '';

    return {
      name,
      email:ctx?.email,
      initials: this.initialsFrom(name),
    };
  });

  readonly languages = ['FR', 'EN'] as const;

  // ─── Helpers ──────────────────────────────────────────────

  /**
   * Derive up-to-two-letter initials from a full name.
   *   "Maman Pauline"      → "MP"
   *   "Le Chaudron Sawa"   → "LC"
   *   "Awa"                → "A"
   *   ""                   → "?"
   */
  private initialsFrom(name: string): string {
    const parts = name
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }

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

  // ─── Template helpers ─────────────────────────────────────

  isGroup(item: NavItem): item is NavGroup {
    return item.kind === 'group';
  }

  isLink(item: NavItem): item is NavLink {
    return item.kind === 'link';
  }

  logout(): void {
    this.closeAllDropdowns();
    this.keycloakService.logout();
  }
}

// ═══════════════════════════════════════════════════════════════
//  Menu definitions per workspace
// ═══════════════════════════════════════════════════════════════

const VENDOR_MENU: readonly NavItem[] = [
  {
    kind: 'group',
    label: 'Gestion des Plats',
    children: [
      { kind: 'link', label: 'Liste des plats', route: '/vendor/meals',     icon: 'format_list_bulleted' },
      { kind: 'link', label: 'Nouveau plat',     route: '/vendor/meals/new', icon: 'add_circle' },
    ],
  },
  {
    kind: 'group',
    label: 'Gestion des Commandes',
    children: [
      { kind: 'link', label: 'Commandes en direct',     route: '/vendor/orders', icon: 'receipt_long', badge: { type: 'count', value: 3 } },
      { kind: 'link', label: 'Stocks & Disponibilités', route: '/vendor/stocks', icon: 'inventory_2' },
    ],
  },
  { kind: 'link', label: 'Statistiques', route: '/vendor/stats' },
];

const ADMIN_MENU: readonly NavItem[] = [
  {
    kind: 'group',
    label: 'Catalogue de mets',
    children: [
      { kind: 'link', label: 'Catégories',  route: '/admin/categories',  icon: 'category' },
      { kind: 'link', label: 'Ingrédients', route: '/admin/ingredients', icon: 'grocery' },
      { kind: 'link', label: 'Plats',       route: '/admin/meals',       icon: 'restaurant_menu' },
    ],
  },
  {
    kind: 'group',
    label: 'Vendeurs & lieux',
    children: [
      { kind: 'link', label: 'Vendeurs',     route: '/admin/vendors',   icon: 'storefront' },
      { kind: 'link', label: 'Emplacements', route: '/admin/locations', icon: 'location_on' },
    ],
  },
  { kind: 'link', label: 'Modération', route: '/admin/moderation' },
  { kind: 'link', label: 'Paramètres', route: '/admin/settings' },
];

const CUSTOMER_MENU: readonly NavItem[] = [
  { kind: 'link', label: 'Explorer les plats', route: '/meals' },
  { kind: 'link', label: 'Mes commandes',      route: '/account/orders' },
  { kind: 'link', label: 'Mes favoris',        route: '/account/favorites' },
  { kind: 'link', label: 'Mon compte',         route: '/account' },
];
