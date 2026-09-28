import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { IconComponent } from '@components/shared/icon/icon.component';
import { KeycloakService } from '@app/core/services/auth/keycloak.service';

type DeniedRole = 'ADMIN' | 'VENDOR' | 'CUSTOMER';
type DeniedReason = 'role-missing' | 'context-missing';

@Component({
  selector: 'app-user-access-denied-page',
  standalone: true,
  imports: [IconComponent],
  templateUrl: './user-access-denied.page.html',
  styleUrl: './user-access-denied.page.scss',
})
export class UserAccessDeniedPage {
  private readonly route    = inject(ActivatedRoute);
  private readonly router   = inject(Router);
  private readonly keycloak = inject(KeycloakService);

  /** Live view of the query params. */
  private readonly queryParams = toSignal(
    this.route.queryParamMap.pipe(map(p => ({
      reason: (p.get('reason') as DeniedReason | null) ?? 'role-missing',
      role:   (p.get('role')   as DeniedRole   | null) ?? null,
      from:   p.get('from'),
    }))),
    { initialValue: { reason: 'role-missing' as DeniedReason, role: null as DeniedRole | null, from: null as string | null } },
  );

  protected readonly role = computed(() => this.queryParams().role);

  protected readonly userEmail = computed(
    () => this.keycloak.getUserEmail() ?? 'Utilisateur',
  );

  /** Human-readable role label, used in the message. */
  protected readonly roleLabel = computed(() => {
    switch (this.role()) {
      case 'ADMIN':    return 'administrateur';
      case 'VENDOR':   return 'vendeur';
      case 'CUSTOMER': return 'client';
      default:         return 'cette section';
    }
  });

  /** Full sentence, built from the params. */
  protected readonly message = computed(() => {
    const email = this.userEmail();
    const reason = this.queryParams().reason;

    switch (reason) {
      case 'role-missing':
        if (this.role()) {
          return `${email} n'a pas accès aux pages ${this.roleLabel()}.`;
        }
        return `${email} n'a pas les permissions requises pour accéder à cette page.`;

      case 'context-missing':
        if (this.role()) {
          return `Aucun profil ${this.roleLabel()} n'est associé à ${email}.`;
        }
        return `Aucun profil n'est associé à ${email}.`;

      default:
        return `${email} n'a pas accès à cette page.`;
    }
  });

  goHome(): void {
    this.router.navigate(['/meals']);
  }

  async logout(): Promise<void> {
    await this.keycloak.logout();
  }
}
