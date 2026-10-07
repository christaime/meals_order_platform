import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '@components/shared/icon/icon.component';
import { BadgeComponent } from '@components/shared/badge/badge.component';

export interface CoverageZone {
  city: string;
  neighborhoods: string[];
  estimatedTime: string;
}

/**
 * DeliveryCoverageSection — Visual banner displaying delivery zones,
 * guarantees, and coverage highlights to build buyer trust.
 */
@Component({
  selector: 'app-delivery-coverage-section',
  standalone: true,
  imports: [CommonModule, IconComponent, BadgeComponent],
  templateUrl: './delivery-coverage-section.component.html',
  styleUrl: './delivery-coverage-section.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeliveryCoverageSectionComponent {
  /** Optional custom title override. */
  readonly title = input<string>('Consommation à temps');

  /** Supported delivery zones. Defaults to Douala & Yaoundé hubs if not provided. */
  readonly zones = input<CoverageZone[]>([
    /*{
      city: 'Douala',
      neighborhoods: ['Akwa', 'Bonanjo', 'Bonapriso', 'Makepe', 'Kotto', 'Bastos'],
      estimatedTime: '20 - 45 min',
    },
    {
      city: 'Yaoundé',
      neighborhoods: ['Bastos', 'Biyem-Assi', 'Mvan', 'Omnisports', 'Nsam'],
      estimatedTime: '25 - 50 min',
    },*/
  ]);
}
