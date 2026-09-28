import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { IconComponent } from '@components/shared/icon/icon.component';
import { BadgeComponent, BadgeVariant } from '@components/shared/badge/badge.component';
import { Ingredient } from '@app/core/models/marketplace';
import { ModerationStatus, UserType } from '@app/core/models/marketplace/enum-type.model';
import { NgClass } from '@angular/common';
import {
  moderationIcon,
  moderationLabel,
  moderationVariant,
} from '@components/shared/moderation-status/moderation-status.util';

@Component({
  selector: 'app-ingredient-table',
  standalone: true,
  imports: [IconComponent, BadgeComponent, NgClass],
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

 // ─── Moderation helpers (delegated to the shared util) ────
  protected readonly statusVariant = moderationVariant;
  protected readonly statusLabel   = moderationLabel;
  protected readonly statusIcon    = moderationIcon;

  protected creatorLabel(type: UserType): string {
    switch (type) {
      case 'ADMIN':    return 'Admin';
      case 'VENDOR':   return 'Vendeur';
      case 'CUSTOMER': return 'Client';
      case 'SYSTEM':   return 'Système';
    }
  }
}
