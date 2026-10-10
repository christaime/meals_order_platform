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
  } = {}): Promise<void> {
    const ws = opts.workspace ?? 'vendor';
    const roles = opts.roles ?? { vendor: true };

    workspaceMock = jasmine.createSpyObj('WorkspaceService', [], {
      workspace:          signal(ws),
      isAdminWorkspace:   signal(ws === 'admin'),
      isVendorWorkspace:  signal(ws === 'vendor'),
      isCustomerWorkspace:signal(ws === 'customer'),
    });

    keycloakMock = jasmine.createSpyObj('KeycloakService', ['logout'], {
      isVendor:   signal(!!roles.vendor),
      isAdmin:    signal(!!roles.admin),
      isCustomer: signal(!!roles.customer),
    });
    keycloakMock.logout.and.returnValue(Promise.resolve());

    userContextMock = {
      context: signal({
        email: 'marie@chaudron.cm',
        vendor: { businessName: 'Le Chaudron du bon gout' },
      }),
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
  //  Rendering
  // ═══════════════════════════════════════════════════════════

  describe('rendering', () => {
    it('renders the portal label for the vendor workspace', async () => {
      await setup({ workspace: 'vendor' });
      expect(query('[data-testid=header-portal-label]')!.textContent).toContain('Espace Vendeur');
    });

    it('renders the admin portal label for the admin workspace', async () => {
      await setup({ workspace: 'admin', roles: { admin: true } });
      expect(query('[data-testid=header-portal-label]')!.textContent).toContain('Espace Admin');
    });

    it('does not render the profile dropdown until triggered', async () => {
      await setup();
      expect(query('[data-testid=header-profile-trigger]')).toBeTruthy();
      expect(query('[data-testid=header-profile-logout]')).toBeFalsy();
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  Profile dropdown
  // ═══════════════════════════════════════════════════════════

  describe('profile dropdown', () => {
    it('opens on trigger click', async () => {
      await setup();
      click('[data-testid=header-profile-trigger]');
      expect(query('[data-testid=header-profile-logout]')).toBeTruthy();
    });

    it('shows the vendor profile link for a vendor', async () => {
      await setup({ roles: { vendor: true } });
      click('[data-testid=header-profile-trigger]');
      expect(query('[data-testid=header-profile-vendor-profile]')).toBeTruthy();
    });

    it('does NOT render the vendor settings item', async () => {
      await setup({ roles: { vendor: true } });
      click('[data-testid=header-profile-trigger]');
      expect(query('[data-testid=header-profile-vendor-settings]')).toBeFalsy();
    });

    it('shows the customer links for a customer', async () => {
      await setup({ roles: { customer: true } });
      click('[data-testid=header-profile-trigger]');
      expect(query('[data-testid=header-profile-account]')).toBeTruthy();

    });

    it('shows the admin settings link for an admin', async () => {
      await setup({ workspace: 'admin', roles: { admin: true } });
      click('[data-testid=header-profile-trigger]');
      expect(query('[data-testid=header-profile-admin-settings]')).toBeTruthy();
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

      expect(component['profileOpen']()).toBeFalse();
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  Menu per workspace
  // ═══════════════════════════════════════════════════════════

  describe('menu', () => {
    it('shows the vendor menu in the vendor workspace', async () => {
      await setup({ workspace: 'vendor' });
      const labels = [...fixture.nativeElement.querySelectorAll('[data-testid=header-menu-item-label]')]
        .map((el) => el.textContent!.trim());
      expect(labels).toContain('Gestion des Plats');
    });

    it('shows the admin menu in the admin workspace', async () => {
      await setup({ workspace: 'admin', roles: { admin: true } });
      const labels = [...fixture.nativeElement.querySelectorAll('[data-testid=header-menu-item-label]')]
        .map((el) => el.textContent!.trim());
      expect(labels).toContain('Catalogue de mets');
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
});
