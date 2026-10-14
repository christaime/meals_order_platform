import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '@components/shared/icon/icon.component';
import { TranslatePipe } from '@ngx-translate/core';

export interface StatItem {
  id: string;
  icon: string;
  /** Translation key for the stat label. */
  labelKey: string;
  /** Translation key for the highlighted value, when the value is text. */
  highlightKey?: string;
  /** Raw highlighted value (numbers, times, city names) when not translatable. */
  highlight?: string;
}

@Component({
  selector: 'app-quick-stats-pills',
  standalone: true,
  imports: [CommonModule, IconComponent, TranslatePipe],
  templateUrl: './quick-stats-pills.component.html',
  styleUrl: './quick-stats-pills.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuickStatsPillsComponent {
  readonly stats = input<StatItem[]>([
    {
      id: 'delivery',
      icon: 'schedule',
      labelKey: 'quickStats.delivery',
      highlight: '35 min',
    },
    {
      id: 'satisfaction',
      icon: 'star',
      labelKey: 'quickStats.satisfaction',
      highlight: '4.9/5',
    },
    {
      id: 'coverage',
      icon: 'location_on',
      labelKey: 'quickStats.coverage',
      highlight: 'Douala & Yaoundé',
    },
    {
      id: 'hygiene',
      icon: 'verified',
      labelKey: 'quickStats.hygiene',
      highlightKey: 'quickStats.hygieneCertified',
    },
  ]);
}
