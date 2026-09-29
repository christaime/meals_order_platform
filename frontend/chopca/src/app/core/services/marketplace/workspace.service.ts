import { Injectable, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs/operators';

export type Workspace = 'admin' | 'vendor' | 'customer' | 'public';

/**
 * WorkspaceService — tracks the active workspace based on the current route.
 *
 * A "workspace" is the route namespace the user is browsing, not their role:
 *   /admin/*    → admin
 *   /vendor/*   → vendor
 *   /customer/* → customer
 *   everything  → public
 *
 * This lets a user who is BOTH admin and vendor act as either, depending
 * on the page they are on. Services read `workspace()` (or the boolean
 * computeds) to pick the correct API base path.
 *
 * The prefix rules mirror `appGuard`, so access control and API scoping
 * always agree.
 */
@Injectable({ providedIn: 'root' })
export class WorkspaceService {

  private readonly router = inject(Router);

  private readonly _workspace = signal<Workspace>('public');

  /** The current workspace, as a signal. */
  readonly workspace = this._workspace.asReadonly();

  // ─── Convenience computeds ────────────────────────────────
  readonly isAdminWorkspace    = computed(() => this._workspace() === 'admin');
  readonly isVendorWorkspace   = computed(() => this._workspace() === 'vendor');
  readonly isCustomerWorkspace = computed(() => this._workspace() === 'customer');
  readonly isPublicWorkspace   = computed(() => this._workspace() === 'public');

  constructor() {
    // Seed from the current URL — covers deep links and page reloads.
    const initial = this.fromUrl(this.router.url);
    this._workspace.set(initial);
    //console.log(`[WorkspaceService] workspace → ${initial} (initial: ${this.router.url})`);

    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(e => {
        const ws = this.fromUrl(e.urlAfterRedirects);
        this._workspace.set(ws);
        //console.log(`[WorkspaceService] workspace → ${ws} (${e.urlAfterRedirects})`);
      });
  }

  /** Derive the workspace from a URL string. */
  private fromUrl(url: string): Workspace {
    // Strip query / fragment so /admin/meals?x=1 still matches.
    const path = url.split('?')[0].split('#')[0];
    if (path.startsWith('/admin'))    return 'admin';
    if (path.startsWith('/vendor'))   return 'vendor';
    if (path.startsWith('/customer')) return 'customer';
    return 'public';
  }
}
