import { TestBed } from '@angular/core/testing';
import { NavigationEnd, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { WorkspaceService, Workspace } from './workspace.service';

describe('WorkspaceService', () => {
  let routerEvents: Subject<unknown>;
  let routerUrl: string;

  beforeEach(() => {
    routerEvents = new Subject<unknown>();
    routerUrl = '/meals';

    TestBed.configureTestingModule({
      providers: [
        WorkspaceService,
        {
          provide: Router,
          useValue: {
            get url() { return routerUrl; },
            events: routerEvents.asObservable(),
          },
        },
      ],
    });
  });

  /** Simulate a navigation ending at the given URL. */
  function navigateTo(url: string): void {
    routerUrl = url;
    routerEvents.next(new NavigationEnd(1, url, url));
  }

  describe('initial workspace', () => {
    it('defaults to public when the URL has no known prefix', () => {
      routerUrl = '/meals';
      const svc = TestBed.inject(WorkspaceService);
      expect(svc.workspace()).toBe('public' as Workspace);
    });

    it('Even if required authentication, registration is consider as public workspace', () => {
      routerUrl = '/registration/vendor';
      const svc = TestBed.inject(WorkspaceService);
      expect(svc.workspace()).toBe('public' as Workspace);
    });

    it('seeds from /admin', () => {
      routerUrl = '/admin/meals';
      const svc = TestBed.inject(WorkspaceService);
      expect(svc.workspace()).toBe('admin' as Workspace);
    });

    it('seeds from /vendor', () => {
      routerUrl = '/vendor/meals';
      const svc = TestBed.inject(WorkspaceService);
      expect(svc.workspace()).toBe('vendor' as Workspace);
    });

    it('seeds from /customer', () => {
      routerUrl = '/customer/dashboard';
      const svc = TestBed.inject(WorkspaceService);
      expect(svc.workspace()).toBe('customer' as Workspace);
    });
  });

  describe('on navigation', () => {
    it('updates the workspace on NavigationEnd', () => {
      routerUrl = '/meals';
      const svc = TestBed.inject(WorkspaceService);
      expect(svc.workspace()).toBe('public' as Workspace);

      navigateTo('/admin/meals');
      expect(svc.workspace()).toBe('admin' as Workspace);

      navigateTo('/vendor/meals');
      expect(svc.workspace()).toBe('vendor' as Workspace);

      navigateTo('/customer/dashboard');
      expect(svc.workspace()).toBe('customer' as Workspace);
    });

    it('ignores non-NavigationEnd events', () => {
      routerUrl = '/admin/meals';
      const svc = TestBed.inject(WorkspaceService);
      expect(svc.workspace()).toBe('admin' as Workspace);

      routerEvents.next({ type: 'SomethingElse' });
      expect(svc.workspace()).toBe('admin' as Workspace);
    });
  });

  describe('prefix edge cases', () => {
    it('matches /admin exactly', () => {
      routerUrl = '/admin';
      const svc = TestBed.inject(WorkspaceService);
      expect(svc.workspace()).toBe('admin' as Workspace);
    });

    it('strips query params', () => {
      routerUrl = '/admin/meals?foo=1&bar=2';
      const svc = TestBed.inject(WorkspaceService);
      expect(svc.workspace()).toBe('admin' as Workspace);
    });

    it('strips fragments', () => {
      routerUrl = '/vendor/meals#section';
      const svc = TestBed.inject(WorkspaceService);
      expect(svc.workspace()).toBe('vendor' as Workspace);
    });

    it('handles nested paths', () => {
      routerUrl = '/admin/locations/edit/123';
      const svc = TestBed.inject(WorkspaceService);
      expect(svc.workspace()).toBe('admin' as Workspace);
    });
  });
});
