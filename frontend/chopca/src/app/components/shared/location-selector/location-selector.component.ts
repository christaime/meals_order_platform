import {
  Component,
  ChangeDetectionStrategy,
  output, input
} from '@angular/core';
import {
  LocationPickerButtonComponent,
} from '../location-picker-button/location-picker-button.component';
import {
  PickerSize
} from '../location-picker-button/picker-size';
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
      [size]="pickerSize()"
      (locationsChange)="locationsChange.emit($event)"
      (criteriaChange)="criteriaChange.emit($event)"
    />
  `,
  styleUrl: './location-selector.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LocationSelectorComponent {

 // ─── Inputs ──────────────────────────────────────────────────
  /**
   * Display intent for the picker panel.
   *
   * The component maps this to per-breakpoint dimensions. Callers
   * never set width or height directly.
   *
   * Defaults to `comfortable` so existing call sites are unaffected.
   */
  readonly pickerSize = input<PickerSize>('comfortable');

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
