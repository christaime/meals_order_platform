import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { KeycloakService ,UserContextService} from '../../core/services/auth';
import { AuthIntentStore } from '../../core/storage/auth-intent';

@Component({
  standalone: true,
  template: `<div class="p-8 text-center">Signing you in…</div>`,
})
export class CallbackComponent implements OnInit {
  private readonly keycloak = inject(KeycloakService);
  private readonly ctx = inject(UserContextService);
  private readonly router = inject(Router);

  async ngOnInit(): Promise<void> {
    const intent = AuthIntentStore.get();

    // Always load fresh context after redirect — token may be new.
    const context = await this.ctx.reload();

    if (intent === 'vendor-registration') {
      if (context?.vendor) {
        AuthIntentStore.clear();                 // goal achieved
        await this.router.navigate(['/vendor/dashboard']);
      } else {
        // keep intent — the wizard exists precisely because vendor is missing
        await this.router.navigate(['/registration/vendor']);
      }
      return;
    }

    if (intent === 'customer-registration') {
      if (context?.customer) {
        AuthIntentStore.clear();                 // goal achieved
        await this.router.navigate(['/']);
      } else {
        await this.router.navigate(['/registration/customer']);
      }
      return;
    }

    // No intent — default routing
    if (context?.vendor) {
      await this.router.navigate(['/vendor/dashboard']);
    } else {
      await this.router.navigate(['/']);
    }
  }
}
