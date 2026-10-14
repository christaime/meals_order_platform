import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { IconComponent } from '@components/shared/icon/icon.component';

interface IconPreset {
  readonly glyph: string;
  readonly labelKey: string;
}

@Component({
  selector: 'app-category-icon-picker',
  standalone: true,
  imports: [IconComponent, TranslatePipe],
  templateUrl: './category-icon-picker.component.html',
  styleUrl: './category-icon-picker.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryIconPickerComponent {

  readonly value = input<string | null>(null);
  readonly valueChange = output<string | null>();

  protected readonly presets: readonly IconPreset[] = [
    // ── Plats & cuisines ───────────────────────────────────
    { glyph: 'soup_kitchen',          labelKey: 'categoryIconPicker.soup' },
    { glyph: 'set_meal',              labelKey: 'categoryIconPicker.seafood' },
    { glyph: 'outdoor_grill',         labelKey: 'categoryIconPicker.grill' },
    { glyph: 'skillet',               labelKey: 'categoryIconPicker.stew' },
    { glyph: 'rice_bowl',             labelKey: 'categoryIconPicker.rice' },
    { glyph: 'ramen_dining',          labelKey: 'categoryIconPicker.noodles' },
    { glyph: 'kebab_dining',          labelKey: 'categoryIconPicker.skewers' },
    { glyph: 'tapas',                 labelKey: 'categoryIconPicker.starters' },

    // ── Moments & formats ──────────────────────────────────
    { glyph: 'lunch_dining',          labelKey: 'categoryIconPicker.lunch' },
    { glyph: 'dinner_dining',         labelKey: 'categoryIconPicker.dinner' },
    { glyph: 'brunch_dining',         labelKey: 'categoryIconPicker.brunch' },
    { glyph: 'bakery_dining',         labelKey: 'categoryIconPicker.pastry' },
    { glyph: 'icecream',              labelKey: 'categoryIconPicker.icecream' },
    { glyph: 'cake',                  labelKey: 'categoryIconPicker.cake' },
    { glyph: 'celebration',           labelKey: 'categoryIconPicker.celebration' },

    // ── Diététique & terroir ───────────────────────────────
    { glyph: 'eco',                   labelKey: 'categoryIconPicker.plant' },
    { glyph: 'grass',                 labelKey: 'categoryIconPicker.herbs' },
    { glyph: 'local_fire_department', labelKey: 'categoryIconPicker.spicy' },
    { glyph: 'water_drop',            labelKey: 'categoryIconPicker.sauce' },
    { glyph: 'agriculture',           labelKey: 'categoryIconPicker.terroir' },

    // ── Généraliste ────────────────────────────────────────
    { glyph: 'restaurant',            labelKey: 'categoryIconPicker.general' },
    { glyph: 'restaurant_menu',       labelKey: 'categoryIconPicker.menu' },
    { glyph: 'fastfood',              labelKey: 'categoryIconPicker.streetfood' },
    { glyph: 'local_dining',          labelKey: 'categoryIconPicker.local' },
  ];

  protected readonly selected = computed(() => this.value());

  protected pick(glyph: string): void {
    this.valueChange.emit(this.selected() === glyph ? null : glyph);
  }
}
