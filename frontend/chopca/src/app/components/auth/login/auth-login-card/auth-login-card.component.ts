import { Component, ChangeDetectionStrategy, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { IconComponent } from '@components/shared/icon/icon.component';
import {
  SocialLoginButtonsComponent,
  SocialProvider,
} from '@components/shared';
import { KeycloakService } from '@core/services/auth/keycloak.service';

@Component({
  selector: 'app-auth-login-card',
  standalone: true,
  imports: [IconComponent, SocialLoginButtonsComponent],
  templateUrl: './auth-login-card.component.html',
  styleUrl: './auth-login-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthLoginCardComponent {

  private readonly keycloak = inject(KeycloakService);

  readonly loading = signal(false);

  protected async onProviderClick(provider: SocialProvider): Promise<void> {
    if (this.loading()) return;
    this.loading.set(true);

    try {
      await this.keycloak.login(provider);
    } catch {
      this.loading.set(false);
    }
  }

}
