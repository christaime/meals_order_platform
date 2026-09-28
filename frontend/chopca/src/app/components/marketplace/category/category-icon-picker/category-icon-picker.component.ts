import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { IconComponent } from '@components/shared/icon/icon.component';

interface IconPreset {
  readonly glyph: string;
  readonly label: string;
}

@Component({
  selector: 'app-category-icon-picker',
  standalone: true,
  imports: [IconComponent],
  templateUrl: './category-icon-picker.component.html',
  styleUrl: './category-icon-picker.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryIconPickerComponent {

  readonly value = input<string | null>(null);
  readonly valueChange = output<string | null>();

  protected readonly presets: readonly IconPreset[] = [
    // ── Plats & cuisines ───────────────────────────────────
    { glyph: 'soup_kitchen',          label: 'Soupes & Sauces' },
    { glyph: 'set_meal',              label: 'Poisson & Fruits de mer' },
    { glyph: 'outdoor_grill',         label: 'Grillades & Braisés' },
    { glyph: 'skillet',               label: 'Marmites & Banquets' },
    { glyph: 'rice_bowl',             label: 'Riz & Céréales' },
    { glyph: 'ramen_dining',          label: 'Pâtes & Nouilles' },
    { glyph: 'kebab_dining',          label: 'Brochettes & Soya' },
    { glyph: 'tapas',                 label: 'Entrées & Amuse-bouche' },

    // ── Moments & formats ──────────────────────────────────
    { glyph: 'lunch_dining',          label: 'Déjeuner' },
    { glyph: 'dinner_dining',         label: 'Dîner' },
    { glyph: 'brunch_dining',         label: 'Brunch' },
    { glyph: 'bakery_dining',         label: 'Beignets & Pâtisseries' },
    { glyph: 'icecream',              label: 'Desserts glacés' },
    { glyph: 'cake',                  label: 'Gâteaux & Douceurs' },
    { glyph: 'celebration',           label: 'Fêtes & Événements' },

    // ── Diététique & terroir ───────────────────────────────
    { glyph: 'eco',                   label: 'Végétal & Bio' },
    { glyph: 'grass',                 label: 'Herbes & Feuilles' },
    { glyph: 'local_fire_department', label: 'Épicé & Piment' },
    { glyph: 'water_drop',            label: 'Sauces & Bouillons' },
    { glyph: 'agriculture',           label: 'Produits du terroir' },

    // ── Généraliste ────────────────────────────────────────
    { glyph: 'restaurant',            label: 'Généraliste' },
    { glyph: 'restaurant_menu',       label: 'Menu' },
    { glyph: 'fastfood',              label: 'Street Food' },
    { glyph: 'local_dining',          label: 'Cuisine locale' },
  ];

  protected readonly selected = computed(() => this.value());

  protected pick(glyph: string): void {
    // Toggle off if re-clicked
    this.valueChange.emit(this.selected() === glyph ? null : glyph);
  }
}
