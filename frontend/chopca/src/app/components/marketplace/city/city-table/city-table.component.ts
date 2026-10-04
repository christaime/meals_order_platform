import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { NgClass } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { IconComponent } from '@components/shared/icon/icon.component';
import { City } from '@app/core/models/marketplace';

@Component({
  selector: 'app-city-table',
  standalone: true,
  imports: [
    NgClass,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    IconComponent,
  ],
  templateUrl: './city-table.component.html',
  styleUrl: './city-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CityTableComponent {

  readonly cities    = input.required<readonly City[]>();
  readonly loading   = input<boolean>(false);
  readonly editingId = input<string | null>(null);

  readonly edit   = output<City>();
  readonly delete = output<City>();

  protected onEdit(city: City): void   { this.edit.emit(city); }
  protected onDelete(city: City): void { this.delete.emit(city); }

  protected trackById(_: number, city: City): string {
    return city.id;
  }
}
