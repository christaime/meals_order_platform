import {
  Component,
  ChangeDetectionStrategy,
  model,
  input,
  output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '@components/shared/icon/icon.component';

/**
 * SearchBar — Primary text input for meal, vendor, or ingredient searching.
 *
 * Responsibilities:
 * - Handle search input queries with two-way signal binding support (`query`).
 * - Provide instant clear button when query text is non-empty.
 * - Emit submit/search events when Enter is pressed or search button is clicked.
 */
@Component({
  selector: 'app-search-bar',
  standalone: true,
  imports: [CommonModule, IconComponent],
  templateUrl: './search-bar.component.html',
  styleUrl: './search-bar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchBarComponent {
  // ─── Signals ──────────────────────────────────────────────────────
  /** Two-way bindable search query string. */
  readonly query = model<string>('');

  /** Customizable input placeholder text. */
  readonly placeholder = input<string>(
    'Rechercher un plat, un ingrédient ou un restaurant...'
  );

  /** Emitted when the search action is triggered (Enter key or click). */
  readonly search = output<string>();

  // ─── Actions ──────────────────────────────────────────────────────
  onInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.query.set(value);
  }

  onClear(): void {
    this.query.set('');
    this.search.emit('');
  }

  onSubmit(): void {
    this.search.emit(this.query());
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.onSubmit();
    }
  }
}
