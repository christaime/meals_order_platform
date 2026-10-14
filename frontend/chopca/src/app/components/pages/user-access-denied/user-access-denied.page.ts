import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { map } from 'rxjs';
import { IconComponent } from '@components/shared/icon/icon.component';
import { KEYCLOAK_SERVICE } from '@core/services/auth/keycloak.service';

type DeniedRole = 'ADMIN' | 'VENDOR' | 'CUSTOMER';
type DeniedReason = 'role-missing' | 'context-missing';

/** What the template interpolates into the message pipe. */
interface MessageDescriptor {
  readonly key: string;
  readonly params: Record<string, string>;
}

@Component({
  selector: 'app-user-access-denied-page',
  standalone: true,
  imports: [IconComponent, TranslatePipe],
  templateUrl: './user-access-denied.page.html',
  styleUrl: './user-access-denied.page.scss',
})
export class UserAccessDeniedPage {
  private readonly route    = inject(ActivatedRoute);
  private readonly router   = inject(Router);
  private readonly keycloak = inject(KEYCLOAK_SERVICE);
  private readonly translate = inject(TranslateService);

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

  /**
   * The email, or the translated fallback. Uses instant() because this
   * computed can't return a key (the template interpolates the value
   * into a piped message). Safe: the page renders only after the app
   * has bootstrapped, so the store is loaded.
   */
  protected readonly userEmail = computed(
    () => this.keycloak.getUserEmail()
       ?? this.translate.instant('userAccessDenied.fallbackUser'),
  );

  /** Translation key for the role label. */
  private readonly roleLabelKey = computed(() => {
    switch (this.role()) {
      case 'ADMIN':    return 'userAccessDenied.role.ADMIN';
      case 'VENDOR':   return 'userAccessDenied.role.VENDOR';
      case 'CUSTOMER': return 'userAccessDenied.role.CUSTOMER';
      default:         return 'userAccessDenied.role.unknown';
    }
  });

  /**
   * The role label, resolved. Used as a param for the message pipe —
   * the pipe can't resolve a nested key, so we resolve here.
   */
  protected readonly roleLabel = computed(
    () => this.translate.instant(this.roleLabelKey()),
  );

  /**
   * Key + params for the message. The template pipes:
   *   {{ message().key | translate: message().params }}
   */
  protected readonly message = computed<MessageDescriptor>(() => {
    const email = this.userEmail();
    const reason = this.queryParams().reason;
    const hasRole = this.role() != null;

    if (reason === 'role-missing') {
      if (hasRole) {
        return {
          key: 'userAccessDenied.message.roleMissingWithRole',
          params: { email, role: this.roleLabel() } as Record<string, string>,
        };
      }
      return {
        key: 'userAccessDenied.message.roleMissing',
        params: { email } as Record<string, string>,
      };
    }

    if (reason === 'context-missing') {
      if (hasRole) {
        return {
          key: 'userAccessDenied.message.contextMissingWithRole',
          params: { email, role: this.roleLabel() } as Record<string, string>,
        };
      }
      return {
        key: 'userAccessDenied.message.contextMissing',
        params: { email } as Record<string, string>,
      };
    }

    return {
      key: 'userAccessDenied.message.default',
      params: { email } as Record<string, string>,
    };
  });

  goHome(): void {
    this.router.navigate(['/meals']);
  }

  async logout(): Promise<void> {
    await this.keycloak.logout();
  }
}
