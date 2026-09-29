import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthHeaderComponent } from './auth-header/auth-header.component';
import { AuthFooterComponent } from './auth-footer/auth-footer.component';

/**
 * Layout shell for all vendor-auth pages.
 *
 * Composes:
 * - Fixed header (AuthHeaderComponent)
 * - A `<main>` region with `<router-outlet>` for the page content
 * - Footer (AuthFooterComponent)
 *
 * The header is fixed (64px tall), so `<main>` gets `pt-16` to match.
 * This is the single place that padding lives.
 *
 * Note: This is the only component in the project using inline
 * template + styles. Kept as a single file because the template is
 * tiny and has no meaningful styling.
 */
@Component({
  selector: 'app-auth-layout',
  standalone: true,
  imports: [RouterOutlet, AuthHeaderComponent, AuthFooterComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen flex flex-col bg-surface">

      <!-- ─── Header (fixed, 64px tall) ─────────────────── -->
      <app-auth-header />

      <!-- ─── Page content ──────────────────────────────── -->
      <main class="flex-1 w-full pt-20">
        <router-outlet />
      </main>

      <!-- ─── Footer ────────────────────────────────────── -->
      <app-auth-footer />

    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `],
})
export class AuthLayoutComponent {}
