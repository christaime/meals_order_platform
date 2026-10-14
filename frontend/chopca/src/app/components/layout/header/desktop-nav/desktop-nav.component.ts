import {
  Component, ChangeDetectionStrategy, input, output,
} from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { IconComponent } from '@components/shared/icon/icon.component';
import { NavItemComponent } from '../nav-item/nav-item.component';
import { NavItem, NavGroup, NavLink } from '@app/core/models/auth/nav-menu.models';

@Component({
  selector: 'app-desktop-nav',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, IconComponent, NavItemComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './desktop-nav.component.html',
})
export class DesktopNavComponent {
  readonly menu = input.required<readonly NavItem[]>();
  readonly openIndex = input<number | null>(null);

  readonly toggleGroup = output<{ index: number; event: MouseEvent }>();
  readonly navigate = output<void>();

  isGroup(item: NavItem): item is NavGroup { return item.kind === 'group'; }
  isLink(item: NavItem): item is NavLink { return item.kind === 'link'; }

  asNavLink(item: NavItem): NavLink { return item as NavLink; }
}
