import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { IconComponent } from '@components/shared/icon/icon.component';
import { BadgeComponent, BadgeVariant } from '@components/shared/badge/badge.component';
import { Category } from '@app/core/models/marketplace';
import { CategoryType, ModerationStatus } from '@app/core/models/marketplace/enum-type.model';
import { NgClass } from '@angular/common';
import {
  moderationIcon,
  moderationLabel,
  moderationVariant,
} from '@components/shared/moderation-status/moderation-status.util';

@Component({
  selector: 'app-category-table',
  standalone: true,
  imports: [IconComponent, BadgeComponent, NgClass],
  templateUrl: './category-table.component.html',
  styleUrl: './category-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryTableComponent {

  readonly categories = input.required<readonly Category[]>();
  readonly loading = input<boolean>(false);

  readonly edit = output<Category>();
  readonly toggleStatus = output<Category>();
  readonly delete = output<Category>();

  readonly editingId = input<string | null>(null);
  protected isEditing(row: Category): boolean {
    return this.editingId() === row.id;
  }

  protected typeVariant(type: CategoryType): BadgeVariant {
    return type === 'CUISINE' ? 'primary' : 'tertiary';
  }

  protected typeLabel(type: CategoryType): string {
    return type === 'CUISINE' ? 'CUISINE' : 'TYPE DE PLAT';
  }

 // ─── Moderation helpers (delegated to the shared util) ────
  protected readonly statusVariant = moderationVariant;
  protected readonly statusLabel   = moderationLabel;
  protected readonly statusIcon    = moderationIcon;

  protected canToggle(c: Category): boolean {
    return c.status === 'APPROVED' || c.status === 'DISABLED';
  }
}
