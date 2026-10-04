import { TestBed, fakeAsync, flushMicrotasks, tick } from '@angular/core/testing';
import {
  HttpClient,
  HttpErrorResponse,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import Keycloak from 'keycloak-js';

import { authInterceptor } from './auth.interceptor';
import { SessionManager } from '../services/session/session-manager.service';
import { AppSessionStore, RETURN_URL_KEY } from '@app/core/storage/app.store';
import { environment } from '@environments/environment';

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;

  // ─── Mocks ────────────────────────────────────────────────
  const session = {
    getFreshToken: jasmine.createSpy('getFreshToken'),
    forceRefresh:  jasmine.createSpy('forceRefresh'),
  };

  const keycloak = {
    login: jasmine.createSpy('login'),
  };

  beforeEach(() => {
    session.getFreshToken.calls.reset();
    session.forceRefresh.calls.reset();
    keycloak.login.calls.reset();

    AppSessionStore.clear(RETURN_URL_KEY);

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: SessionManager, useValue: session },
        { provide: Keycloak, useValue: keycloak },
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    AppSessionStore.clear(RETURN_URL_KEY);
  });

  // ═══════════════════════════════════════════════════════════
  //  Pass-through cases
  // ═══════════════════════════════════════════════════════════

  describe('non-API requests', () => {
    it('passes through requests to other origins without a token', () => {
      session.getFreshToken.and.returnValue(Promise.resolve('token'));

      http.get('https://external.example.com/data').subscribe();

      const req = httpMock.expectOne('https://external.example.com/data');
      expect(req.request.headers.has('Authorization')).toBe(false);
      expect(session.getFreshToken).not.toHaveBeenCalled();
      req.flush({});
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  API requests
  // ═══════════════════════════════════════════════════════════

  describe('API requests', () => {
    it('injects the bearer token from SessionManager', fakeAsync(() => {
      session.getFreshToken.and.returnValue(Promise.resolve('my-token'));

      http.get(`${environment.apiUrl}/meals`).subscribe();

      // Flush the interceptor's promise chain.
      flushMicrotasks();

      const req = httpMock.expectOne(`${environment.apiUrl}/meals`);
      expect(req.request.headers.get('Authorization')).toBe('Bearer my-token');
      req.flush({});
    }));

    it('sends the request without a token when none is available', fakeAsync(() => {
      session.getFreshToken.and.returnValue(Promise.resolve(''));

      http.get(`${environment.apiUrl}/meals`).subscribe();

      flushMicrotasks();

      const req = httpMock.expectOne(`${environment.apiUrl}/meals`);
      expect(req.request.headers.has('Authorization')).toBe(false);
      req.flush({});
    }));
  });

  // ═══════════════════════════════════════════════════════════
  //  401 recovery — the important part
  // ═══════════════════════════════════════════════════════════

  describe('401 recovery', () => {
    it('forces a refresh and retries the request once', fakeAsync(() => {
      session.getFreshToken.and.returnValue(Promise.resolve('stale-token'));
      session.forceRefresh.and.returnValue(Promise.resolve('fresh-token'));

      let result: unknown = null;
      http.get(`${environment.apiUrl}/meals`).subscribe(v => (result = v));

      flushMicrotasks();

      // 1st request — the stale one.
      const first = httpMock.expectOne(`${environment.apiUrl}/meals`);
      expect(first.request.headers.get('Authorization')).toBe('Bearer stale-token');
      first.flush({}, { status: 401, statusText: 'Unauthorized' });

      // Let the interceptor react: forceRefresh + retry.
      flushMicrotasks();

      expect(session.forceRefresh).toHaveBeenCalledTimes(1);

      // 2nd request — the retry with the fresh token.
      const retry = httpMock.expectOne(`${environment.apiUrl}/meals`);
      expect(retry.request.headers.get('Authorization')).toBe('Bearer fresh-token');
      retry.flush({ ok: true });

      flushMicrotasks();

      expect(result).toEqual({ ok: true });
    }));

    it('does NOT retry twice — a second 401 on the retry triggers login', fakeAsync(() => {
      session.getFreshToken.and.returnValue(Promise.resolve('stale-token'));
      session.forceRefresh.and.returnValue(Promise.resolve('fresh-token'));

      http.get(`${environment.apiUrl}/meals`).subscribe({ error: () => {} });

      flushMicrotasks();

      const first = httpMock.expectOne(`${environment.apiUrl}/meals`);
      first.flush({}, { status: 401, statusText: 'Unauthorized' });

      flushMicrotasks();

      // Retry also 401s — interceptor should give up and redirect.
      const retry = httpMock.expectOne(`${environment.apiUrl}/meals`);
      retry.flush({}, { status: 401, statusText: 'Unauthorized' });

      flushMicrotasks();

      expect(session.forceRefresh).toHaveBeenCalledTimes(1);
      expect(keycloak.login).toHaveBeenCalledTimes(1);
    }));

    it('redirects to login when the refresh itself fails', fakeAsync(() => {
      session.getFreshToken.and.returnValue(Promise.resolve('stale-token'));
      // callFake: create the rejected promise ON CALL, not at spy setup,
      // so zone.js doesn't flag it as an unhandled rejection.
      session.forceRefresh.and.callFake(() =>
        Promise.reject(new Error('session gone')),
      );

      http.get(`${environment.apiUrl}/meals`).subscribe({ error: () => {} });

      flushMicrotasks();

      const first = httpMock.expectOne(`${environment.apiUrl}/meals`);
      first.flush({}, { status: 401, statusText: 'Unauthorized' });

      flushMicrotasks();

      expect(keycloak.login).toHaveBeenCalledTimes(1);
      const loginArgs = keycloak.login.calls.mostRecent().args[0];
      expect(loginArgs.redirectUri).toBe(
        `${window.location.origin}/auth/callback`,
      );
    }));

    it('persists the current URL to AppSessionStore before redirecting', fakeAsync(() => {
      session.getFreshToken.and.returnValue(Promise.resolve('stale-token'));
      session.forceRefresh.and.callFake(() =>
        Promise.reject(new Error('session gone')),
      );

      http.get(`${environment.apiUrl}/meals`).subscribe({ error: () => {} });

      flushMicrotasks();

      const first = httpMock.expectOne(`${environment.apiUrl}/meals`);
      first.flush({}, { status: 401, statusText: 'Unauthorized' });

      flushMicrotasks();

      const stored = AppSessionStore.get(RETURN_URL_KEY);
      expect(stored).toBe(
        window.location.pathname + window.location.search,
      );
    }));
  });

  // ═══════════════════════════════════════════════════════════
  //  403 is NOT a 401
  // ═══════════════════════════════════════════════════════════

  describe('403 handling', () => {
    it('passes a 403 through without refreshing or redirecting', fakeAsync(() => {
      session.getFreshToken.and.returnValue(Promise.resolve('valid-token'));

      let error: HttpErrorResponse | null = null;
      http.get(`${environment.apiUrl}/admin/secret`).subscribe({
        error: e => (error = e),
      });

      flushMicrotasks();

      const req = httpMock.expectOne(`${environment.apiUrl}/admin/secret`);
      req.flush({}, { status: 403, statusText: 'Forbidden' });

      flushMicrotasks();

      expect(error).not.toBeNull();
      expect(error!.status).toBe(403);
      expect(session.forceRefresh).not.toHaveBeenCalled();
      expect(keycloak.login).not.toHaveBeenCalled();
    }));
  });
});
