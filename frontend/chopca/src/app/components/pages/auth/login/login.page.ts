import { Component, ChangeDetectionStrategy } from '@angular/core';
import { AuthLoginCardComponent , AuthHeroPanelComponent} from '@components/auth/login';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [AuthLoginCardComponent, AuthHeroPanelComponent],
  templateUrl: "./login.page.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPageComponent {}
