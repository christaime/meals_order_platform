import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { UserContextService } from '../../core/services/auth';
import { AppSessionStore, RETURN_URL_KEY } from '../../core/storage/app.store';
import { KEYCLOAK_SERVICE } from '@core/services/auth/keycloak.service';

@Component({
  standalone: true,
  template: `<div class="p-8 text-center">Signing you in…</div>`,
})
export class CallbackComponent implements OnInit {
  private readonly ctx    = inject(UserContextService);
  private readonly keycloakUserRoles  = inject(KEYCLOAK_SERVICE);
  private readonly router = inject(Router);

  async ngOnInit(): Promise<void> {
    // Refresh session state from the new token.
    this.keycloakUserRoles.reload();
    await this.ctx.reload().catch(() => null);

    // Consume the returnUrl (reads and clears it).
    const returnUrl = AppSessionStore.consume(RETURN_URL_KEY) ?? '/meals';
    console.log("callback returnUrl =",returnUrl);
    // Navigate. The guard re-runs and enforces the correct rule.
    await this.router.navigateByUrl(returnUrl);
  }
}
