import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { IconComponent } from '@components/shared/icon/icon.component';
import { BadgeComponent } from '@components/shared/badge/badge.component';
import { Location } from '@app/core/models/marketplace';
import { DecimalPipe, NgClass } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import {
  moderationIcon,
  moderationLabelKey,
  moderationVariant,
} from '@components/shared/moderation-status/moderation-status.util';

@Component({
  selector: 'app-location-table',
  standalone: true,
  imports: [DecimalPipe, NgClass, IconComponent, BadgeComponent, TranslatePipe],
  templateUrl: './location-table.component.html',
  styleUrl: './location-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LocationTableComponent {

  readonly locations = input.required<readonly Location[]>();
  readonly loading = input<boolean>(false);
  readonly editingId = input<string | null>(null);
  readonly scope = input<'vendor' | 'admin'>('vendor');

  readonly edit = output<Location>();
  readonly select = output<Location>();
  readonly delete = output<Location>();

  protected isEditing(loc: Location): boolean {
    return this.editingId() === loc.id;
  }

  protected readonly statusVariant = moderationVariant;
  protected readonly statusLabelKey = moderationLabelKey;
  protected readonly statusIcon    = moderationIcon;
}
