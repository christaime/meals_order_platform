// nav-item/nav-item.component.ts
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { IconComponent } from '@components/shared/icon/icon.component';

export interface NavItemDisplay {
  readonly labelKey: string;
  readonly icon?: string;
  readonly badge?: { type: 'count'; value: number } | { type: 'dot' };
}

@Component({
  selector: 'app-nav-item',
  standalone: true,
  imports: [IconComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (item().icon) {
      <app-icon [name]="item().icon!" size="sm" />
    }
    <span data-testid="header-menu-item-label">{{ item().labelKey | translate }}</span>

    @if (item().badge?.type === 'count') {
      <span
        class="ml-auto bg-secondary text-on-secondary
               text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
        {{ $any(item().badge).value }}
      </span>
    }
    @if (item().badge?.type === 'dot') {
      <span class="ml-auto w-2 h-2 rounded-full bg-primary"></span>
    }
  `,
})
export class NavItemComponent {
  readonly item = input.required<NavItemDisplay>();
}
