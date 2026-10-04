import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { VendorCard } from '@core/models/ai/chat.models';

/**
 * A single vendor card in the chat.
 *
 * Two modes:
 *   - compact (default) — avatar, business name, city, rating, cuisines.
 *   - expanded — the compact fields plus description and full address.
 *
 * Emits `navigate` when the user clicks. The parent decides where to
 * route (typically the public vendor detail page).
 */
@Component({
  selector: 'app-chat-vendor-card',
  standalone: true,
  imports: [DecimalPipe, MatIconModule],
  templateUrl: './chat-vendor-card.component.html',
  styleUrl: './chat-vendor-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatVendorCardComponent {

  readonly vendor = input.required<VendorCard>();
  readonly expanded = input<boolean>(false);

  readonly navigate = output<void>();

  protected readonly hasCuisines = computed<boolean>(() =>
    (this.vendor().cuisines ?? []).length > 0,
  );

  protected onClick(): void {
    this.navigate.emit();
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.navigate.emit();
    }
  }
}
