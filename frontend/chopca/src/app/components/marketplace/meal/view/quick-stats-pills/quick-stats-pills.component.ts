import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '@components/shared/icon/icon.component';

export interface StatItem {
  id: string;
  icon: string;
  label: string;
  highlight?: string;
}

/**
 * QuickStatsPills — Renders compact trust badges inside the hero section.
 *
 * Responsibilities:
 * - Display key marketplace value props (delivery time, satisfaction, active zones).
 * - Allow dynamic custom stat items via optional Signal input.
 * - Provide sensible defaults tuned for the marketplace value props.
 */
@Component({
  selector: 'app-quick-stats-pills',
  standalone: true,
  imports: [CommonModule, IconComponent],
  templateUrl: './quick-stats-pills.component.html',
  styleUrl: './quick-stats-pills.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuickStatsPillsComponent {
  /** Optional custom stat items. Defaults to primary hero trust metrics if omitted. */
  readonly stats = input<StatItem[]>([
    {
      id: 'delivery',
      icon: 'schedule',
      label: 'Livraison moyenne',
      highlight: '35 min',
    },
    {
      id: 'satisfaction',
      icon: 'star',
      label: 'Note clients',
      highlight: '4.9/5',
    },
    {
      id: 'coverage',
      icon: 'location_on',
      label: 'Zones',
      highlight: 'Douala & Yaoundé',
    },
    {
      id: 'hygiene',
      icon: 'verified',
      label: 'Cuisines',
      highlight: '100% Vérifiées',
    },
  ]);
}
