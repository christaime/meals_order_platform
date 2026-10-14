import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { DecimalPipe, NgClass } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { IconComponent } from '@components/shared/icon/icon.component';
import { BadgeComponent } from '@components/shared/badge/badge.component';
import {
  moderationIcon,
  moderationLabelKey,
  moderationVariant,
} from '@components/shared/moderation-status/moderation-status.util';
import { MealSummary } from '@app/core/models/marketplace';
import { CategorySummary } from '@app/core/models/marketplace/category.model';

@Component({
  selector: 'app-meal-table',
  standalone: true,
  imports: [DecimalPipe, NgClass, IconComponent, BadgeComponent, TranslatePipe],
  templateUrl: './meal-table.component.html',
  styleUrl: './meal-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MealTableComponent {

  readonly meals = input.required<readonly MealSummary[]>();
  readonly loading = input<boolean>(false);
  readonly editingId = input<string | null>(null);
  readonly scope = input<'vendor' | 'admin'>('vendor');

  readonly edit = output<MealSummary>();
  readonly select = output<MealSummary>();
  readonly delete = output<MealSummary>();

  protected isEditing(meal: MealSummary): boolean {
    return this.editingId() === meal.id;
  }

  protected categoryOverflow(
    cuisines: readonly CategorySummary[],
    dishTypes: readonly CategorySummary[],
    limit: number,
  ): number {
    return Math.max(0, cuisines.length + dishTypes.length - limit);
  }

  /** Plural key for a count of ingredients / allergens / locations. */
  protected pluralKey(
    base: 'ingredients' | 'allergens' | 'locations',
    count: number,
  ): string {
    return count > 1
      ? `mealTable.${base}_many`
      : `mealTable.${base}_one`;
  }

  protected readonly statusVariant = moderationVariant;
  protected readonly statusLabelKey = moderationLabelKey;
  protected readonly statusIcon    = moderationIcon;
}
