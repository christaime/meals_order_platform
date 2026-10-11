import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';

import { AuthHeaderComponent } from './auth-header.component';
import { WorkspaceService } from '@app/core/services/marketplace/workspace.service';
import { KEYCLOAK_SERVICE } from '@core/services/auth/keycloak.service';
import { USER_CONTEXT_SERVICE } from '@core/services/auth';
import { LogoComponent } from '@components/shared/logo/logo.component';
import { IconComponent } from '@components/shared/icon/icon.component';

describe('AuthHeaderComponent', () => {
  let fixture: ComponentFixture<AuthHeaderComponent>;
  let component: AuthHeaderComponent;
  let workspaceMock: jasmine.SpyObj<any>;
  let keycloakMock: jasmine.SpyObj<any>;
  let userContextMock: any;

  async function setup(opts: {
    workspace?: 'admin' | 'vendor' | 'customer';
    roles?: { vendor?: boolean; admin?: boolean; customer?: boolean };
    context?: {
      name?: string;
      email?: string;
      vendor?: { businessName: string };
    } | null;
  } = {}): Promise<void> {
    const ws = opts.workspace ?? 'vendor';
    const roles = opts.roles ?? { vendor: true };
    const ctxValue = opts.context === undefined
      ? { name: 'Le Chaudron du bon gout', email: 'marie@chaudron.cm', vendor: { businessName: 'Le Chaudron du bon gout' } }
      : opts.context;

    workspaceMock = jasmine.createSpyObj('WorkspaceService', [], {
      workspace:            signal(ws),
      isAdminWorkspace:     signal(ws === 'admin'),
      isVendorWorkspace:    signal(ws === 'vendor'),
      isCustomerWorkspace:  signal(ws === 'customer'),
    });

    keycloakMock = jasmine.createSpyObj('KeycloakService', ['logout'], {
      isVendor:   signal(!!roles.vendor),
      isAdmin:    signal(!!roles.admin),
      isCustomer: signal(!!roles.customer),
    });
    keycloakMock.logout.and.returnValue(Promise.resolve());

    userContextMock = {
      context: signal(ctxValue),
    };

    await TestBed.configureTestingModule({
      imports: [AuthHeaderComponent, LogoComponent, IconComponent],
      providers: [
        provideRouter([]),
        { provide: WorkspaceService, useValue: workspaceMock },
        { provide: KEYCLOAK_SERVICE, useValue: keycloakMock },
        { provide: USER_CONTEXT_SERVICE, useValue: userContextMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AuthHeaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  // ═══════════════════════════════════════════════════════════
  //  Portal label
  // ═══════════════════════════════════════════════════════════

  describe('portal label', () => {
    it('renders the vendor label in the vendor workspace', async () => {
      await setup({ workspace: 'vendor' });
      expect(query('[data-testid=header-portal-label]')!.textContent).toContain('Espace Vendeur');
    });

    it('renders the admin label in the admin workspace', async () => {
      await setup({ workspace: 'admin', roles: { admin: true } });
      expect(query('[data-testid=header-portal-label]')!.textContent).toContain('Espace Admin');
    });

    it('renders the customer label in the customer workspace', async () => {
      await setup({ workspace: 'customer', roles: { customer: true } });
      expect(query('[data-testid=header-portal-label]')!.textContent).toContain('Espace Client');
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  currentUser computed
  // ═══════════════════════════════════════════════════════════

  describe('currentUser', () => {
    it('reads the name from the context', async () => {
      await setup({ context: { name: 'Marie Ndongo' } });
      expect(component.currentUser().name).toBe('Marie Ndongo');
    });

    it('reads the email from the context', async () => {
      await setup({ context: { name: 'Marie', email: 'marie@chaudron.cm' } });
      expect(component.currentUser().email).toBe('marie@chaudron.cm');
    });

    it('derives two-letter initials from a two-word name', async () => {
      await setup({ context: { name: 'Marie Ndongo' } });
      expect(component.currentUser().initials).toBe('MN');
    });

    it('derives one-letter initials from a single-word name', async () => {
      await setup({ context: { name: 'Awa' } });
      expect(component.currentUser().initials).toBe('A');
    });

    it('falls back to "?" when the context is null', async () => {
      await setup({ context: null });
      expect(component.currentUser().name).toBe('');
      expect(component.currentUser().initials).toBe('?');
    });

    it('falls back to "?" when the context has no name', async () => {
      await setup({ context: { email: 'x@y.cm' } });
      expect(component.currentUser().name).toBe('');
      expect(component.currentUser().initials).toBe('?');
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  Profile trigger
  // ═══════════════════════════════════════════════════════════

  describe('profile trigger', () => {
    it('renders the initials', async () => {
      await setup({ context: { name: 'Marie Ndongo' } });
      expect(query('[data-testid=header-profile-initials]')!.textContent!.trim()).toBe('MN');
    });

    it('does not render the dropdown until triggered', async () => {
      await setup();
      expect(query('[data-testid=header-profile-trigger]')).toBeTruthy();
      expect(query('[data-testid=header-profile-dropdown]')).toBeFalsy();
    });

    it('opens the dropdown on click', async () => {
      await setup();
      click('[data-testid=header-profile-trigger]');
      expect(query('[data-testid=header-profile-dropdown]')).toBeTruthy();
    });

    it('closes the dropdown on a second click', async () => {
      await setup();
      click('[data-testid=header-profile-trigger]');
      click('[data-testid=header-profile-trigger]');
      expect(query('[data-testid=header-profile-dropdown]')).toBeFalsy();
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  Profile dropdown — role-scoped links
  // ═══════════════════════════════════════════════════════════

  describe('profile dropdown links', () => {
    it('shows the vendor link for a vendor', async () => {
      await setup({ roles: { vendor: true } });
      click('[data-testid=header-profile-trigger]');
      expect(query('[data-testid=header-profile-vendor-profile]')).toBeTruthy();
    });

    it('renders the vendor business name in the vendor link', async () => {
      await setup({
        roles: { vendor: true },
        context: { vendor: { businessName: 'Le Chaudron du bon gout' } },
      });
      click('[data-testid=header-profile-trigger]');
      expect(query('[data-testid=header-profile-vendor-profile]')!.textContent)
        .toContain('Le Chaudron du bon gout');
    });

    it('shows the customer account link for a customer', async () => {
      await setup({ roles: { customer: true } });
      click('[data-testid=header-profile-trigger]');
      expect(query('[data-testid=header-profile-account]')).toBeTruthy();
    });

    it('shows the admin settings link for an admin', async () => {
      await setup({ workspace: 'admin', roles: { admin: true } });
      click('[data-testid=header-profile-trigger]');
      expect(query('[data-testid=header-profile-admin-settings]')).toBeTruthy();
    });

    it('does not render the vendor link for a customer-only user', async () => {
      await setup({ workspace: 'customer', roles: { customer: true } });
      click('[data-testid=header-profile-trigger]');
      expect(query('[data-testid=header-profile-vendor-profile]')).toBeFalsy();
    });

    it('always renders the logout button', async () => {
      await setup();
      click('[data-testid=header-profile-trigger]');
      expect(query('[data-testid=header-profile-logout]')).toBeTruthy();
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  Logout
  // ═══════════════════════════════════════════════════════════

  describe('logout', () => {
    it('calls KeycloakService.logout', async () => {
      await setup();
      click('[data-testid=header-profile-trigger]');
      click('[data-testid=header-profile-logout]');
      expect(keycloakMock.logout).toHaveBeenCalledTimes(1);
    });

    it('closes the dropdown before logging out', async () => {
      await setup();
      click('[data-testid=header-profile-trigger]');
      click('[data-testid=header-profile-logout]');
      expect(component.profileOpen()).toBeFalse();
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  Primary menu
  // ═══════════════════════════════════════════════════════════

  describe('primary menu', () => {
    it('renders the vendor menu in the vendor workspace', async () => {
      await setup({ workspace: 'vendor' });
      expect(menuLabels()).toContain('Gestion des Plats');
    });

    it('renders the admin menu in the admin workspace', async () => {
      await setup({ workspace: 'admin', roles: { admin: true } });
      expect(menuLabels()).toContain('Catalogue de mets');
    });

    it('renders the customer menu in the customer workspace', async () => {
      await setup({ workspace: 'customer', roles: { customer: true } });
      expect(menuLabels()).toContain('Explorer les plats');
    });

    it('does not render Modération or Paramètres in the admin menu', async () => {
      await setup({ workspace: 'admin', roles: { admin: true } });
      const labels = menuLabels();
      expect(labels).not.toContain('Modération');
      expect(labels).not.toContain('Paramètres');
    });

    it('does not render Statistiques in the vendor menu', async () => {
      await setup({ workspace: 'vendor' });
      expect(menuLabels()).not.toContain('Statistiques');
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  Menu dropdown children
  // ═══════════════════════════════════════════════════════════

  describe('menu dropdown children', () => {
    it('opens a group dropdown on click and renders its children', async () => {
      await setup({ workspace: 'admin', roles: { admin: true } });

      click('[data-testid=header-menu-item-0]');

      expect(query('[data-testid="header-menu-child-Catégories"]')).toBeTruthy();
      expect(query('[data-testid="header-menu-child-Ingrédients"]')).toBeTruthy();
      expect(query('[data-testid="header-menu-child-Plats"]')).toBeTruthy();
    });

    it('exposes the route on each child link', async () => {
      await setup({ workspace: 'admin', roles: { admin: true } });

      click('[data-testid=header-menu-item-0]');

      const child = query('[data-testid="header-menu-child-Plats"]');
      expect(child!.getAttribute('data-route')).toBe('/admin/meals');
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  Helpers
  // ═══════════════════════════════════════════════════════════

  function query(sel: string): HTMLElement | null {
    return fixture.nativeElement.querySelector(sel);
  }

  function click(sel: string): void {
    const el = query(sel);
    expect(el).withContext('Element not found: ' + sel).toBeTruthy();
    el!.click();
    fixture.detectChanges();
  }

  function menuLabels(): string[] {
    return [...fixture.nativeElement.querySelectorAll('[data-testid=header-menu-item-label]')]
      .map((el) => (el as HTMLElement).textContent!.trim());
  }
});
