import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { IconComponent } from '@components/shared/icon/icon.component';

/**
 * Sort options supported by the city admin page.
 * Values are pipe-separated `field-direction` strings.
 */
export type CitySort =
  | 'name-asc'
  | 'name-desc'
  | 'region-asc'
  | 'region-desc';

@Component({
  selector: 'app-city-filters',
  standalone: true,
  imports: [
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    IconComponent,
  ],
  templateUrl: './city-filters.component.html',
  styleUrl: './city-filters.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CityFiltersComponent {

  readonly keyword = input<string>('');
  readonly sort    = input<CitySort>('name-asc');

  readonly keywordChange = output<string>();
  readonly sortChange    = output<CitySort>();

  protected onKeywordInput(value: string): void {
    this.keywordChange.emit(value);
  }

  protected onSortChange(value: CitySort): void {
    this.sortChange.emit(value);
  }

  protected clearKeyword(): void {
    this.keywordChange.emit('');
  }
}
