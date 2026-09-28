import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { DecimalPipe, NgClass } from '@angular/common';
import { IconComponent } from '@components/shared/icon/icon.component';
import { BadgeComponent } from '@components/shared/badge/badge.component';
import {
  moderationIcon,
  moderationLabel,
  moderationVariant,
} from '@components/shared/moderation-status/moderation-status.util';
import { MealSummary } from '@app/core/models/marketplace';
import { CategorySummary } from '@app/core/models/marketplace/category.model';

@Component({
  selector: 'app-meal-table',
  standalone: true,
  imports: [DecimalPipe, NgClass, IconComponent, BadgeComponent],
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

  /**
   * Cuisine + dish-type badges are capped at 2 to keep the row compact.
   * Returns the overflow count for the "+N" badge.
   */
  protected categoryOverflow(
    cuisines: readonly CategorySummary[],
    dishTypes: readonly CategorySummary[],
    limit: number,
  ): number {
    return Math.max(0, cuisines.length + dishTypes.length - limit);
  }

  // ─── Moderation helpers (delegated to the shared util) ────
  protected readonly statusVariant = moderationVariant;
  protected readonly statusLabel   = moderationLabel;
  protected readonly statusIcon    = moderationIcon;
}
