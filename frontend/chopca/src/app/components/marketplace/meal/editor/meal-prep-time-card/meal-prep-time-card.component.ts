import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  computed,
} from '@angular/core';
import { IconComponent } from '@components/shared/icon/icon.component';

export interface PrepTimePreset {
  /** Short label shown in the card. */
  readonly label: string;
  /** Human-readable range shown under the label. */
  readonly range: string;
  /** Midpoint in minutes — this is what gets sent to the backend. */
  readonly minutes: number;
  /** Highlighted with a "recommended" treatment. */
  readonly recommended?: boolean;
}

/**
 * Step 2 — Prep time card.
 *
 * Emits the selected preset's MIDPOINT IN MINUTES (number).
 * The range string is only for display.
 *
 * Form integration: bind `selectedMinutes` to a FormControl<number>.
 */
@Component({
  selector: 'app-meal-prep-time-card',
  standalone: true,
  imports: [IconComponent],
  templateUrl: './meal-prep-time-card.component.html',
  styleUrl: './meal-prep-time-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MealPrepTimeCardComponent {

  readonly selectedMinutes = input<number | null>(null);

  readonly presets = input<readonly PrepTimePreset[]>([
    { label: 'Prêt à servir',     range: '15 - 20 min', minutes: 18 },
    { label: 'Mijoté classique',  range: '25 - 35 min', minutes: 30, recommended: true },
    { label: 'Braise au charbon', range: '45 - 60 min', minutes: 53 },
    { label: 'Traiteur festif',   range: 'Sur commande', minutes: 1440 },
  ]);

  readonly prepTimeSelected = output<number>();

  protected readonly activePreset = computed<PrepTimePreset | null>(() => {
    const minutes = this.selectedMinutes();
    if (minutes != null) {
      return this.presets().find(p => p.minutes === minutes) ?? null;
    }
    return this.presets().find(p => p.recommended) ?? null;
  });

  protected isActive(preset: PrepTimePreset): boolean {
    return this.activePreset()?.minutes === preset.minutes;
  }

  protected onPresetClick(preset: PrepTimePreset): void {
    this.prepTimeSelected.emit(preset.minutes);
  }
}
