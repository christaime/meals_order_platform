import {
  Component,
  ChangeDetectionStrategy,
  output,
} from '@angular/core';
import {
  LocationPickerButtonComponent,
} from '@components/shared/location-picker-button/location-picker-button.component';
import { LocationSummary } from '@core/models/marketplace';

/**
 * @deprecated Use {@link LocationPickerButtonComponent} directly.
 *
 * Kept as a thin re-export so existing call sites don't change while
 * the app migrates. Once every consumer imports the new component,
 * delete this file.
 */
@Component({
  selector: 'app-location-selector',
  standalone: true,
  imports: [LocationPickerButtonComponent],
  template: `
    <app-location-picker-button
      (locationsChange)="locationsChange.emit($event)"
      (criteriaChange)="criteriaChange.emit($event)"
    />
  `,
  styleUrl: './location-selector.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LocationSelectorComponent {

  readonly locationsChange = output<LocationSummary[]>();

  readonly criteriaChange = output<{
    cityId: string;
    cityName: string;
    areaName?: string;
    latitude?: number;
    longitude?: number;
    radiusKm?: number;
  }>();
}
