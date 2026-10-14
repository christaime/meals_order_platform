import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { IconComponent } from '@components/shared/icon/icon.component';
import { BadgeComponent } from '@components/shared/badge/badge.component';
import { Ingredient } from '@app/core/models/marketplace';
import { UserType } from '@app/core/models/marketplace/enum-type.model';
import { NgClass } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import {
  moderationIcon,
  moderationLabelKey,
  moderationVariant,
} from '@components/shared/moderation-status/moderation-status.util';

@Component({
  selector: 'app-ingredient-table',
  standalone: true,
  imports: [IconComponent, BadgeComponent, NgClass, TranslatePipe],
  templateUrl: './ingredient-table.component.html',
  styleUrl: './ingredient-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IngredientTableComponent {

  readonly ingredients = input.required<readonly Ingredient[]>();
  readonly loading = input<boolean>(false);

  readonly edit = output<Ingredient>();
  readonly toggleActive = output<Ingredient>();
  readonly delete = output<Ingredient>();

  readonly editingId = input<string | null>(null);
  protected isEditing(row: Ingredient): boolean {
    return this.editingId() === row.id;
  }

  protected readonly statusVariant = moderationVariant;
  protected readonly statusLabelKey = moderationLabelKey;
  protected readonly statusIcon    = moderationIcon;

  protected creatorLabelKey(type: UserType): string {
    switch (type) {
      case 'ADMIN':    return 'ingredientTable.creator.ADMIN';
      case 'VENDOR':   return 'ingredientTable.creator.VENDOR';
      case 'CUSTOMER': return 'ingredientTable.creator.CUSTOMER';
      case 'SYSTEM':   return 'ingredientTable.creator.SYSTEM';
    }
  }
}
