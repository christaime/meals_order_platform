
import {
  Component, ChangeDetectionStrategy, input, output,
} from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { IconComponent } from '@components/shared/icon/icon.component';
import { NavItemComponent } from '../nav-item/nav-item.component';
import { NavItem, NavGroup, NavLink } from '@app/core/models/auth/nav-menu.models';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-mobile-nav',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, IconComponent, NavItemComponent ,TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './mobile-nav.component.html',
})
export class MobileNavComponent {
  readonly menu = input.required<readonly NavItem[]>();
  readonly openIndex = input<number | null>(null);
  readonly portalLabelKey = input<string>('');
  readonly links = input.required<{
    vendor:   { labelKey: string; route: string };
    customer: { labelKey: string; route: string };
  }>();
  readonly showVendorSwitch = input<boolean>(false);
  readonly showCustomerSwitch = input<boolean>(false);

  readonly toggleGroup = output<{ index: number; event: MouseEvent }>();
  readonly navigate = output<void>();

  isGroup(item: NavItem): item is NavGroup { return item.kind === 'group'; }
  isLink(item: NavItem): item is NavLink { return item.kind === 'link'; }
  asNavLink(item: NavItem): NavLink { return item as NavLink; }
}
