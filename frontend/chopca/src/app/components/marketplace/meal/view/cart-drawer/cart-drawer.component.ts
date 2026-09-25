import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IconComponent,
  PriceTagComponent,
} from '@components/shared';

export interface CartItem {
  readonly id: string;
  readonly mealId: string;
  readonly name: string;
  readonly price: number;
  readonly quantity: number;
  readonly imageUrl?: string;
  readonly selectedOptions?: string[];
}

export interface CartVendorGroup {
  readonly vendorId: string;
  readonly vendorName: string;
  readonly items: CartItem[];
}

/**
 * CartDrawerComponent — Off-canvas sliding cart overlay.
 * Displays grouped items by vendor, quantity controls, price breakdown, and checkout action.
 */
@Component({
  selector: 'app-cart-drawer',
  standalone: true,
  imports: [CommonModule, IconComponent, PriceTagComponent],
  templateUrl: './cart-drawer.component.html',
  styleUrl: './cart-drawer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CartDrawerComponent {
  // ─── Inputs & Outputs ──────────────────────────────────────────────
  readonly isOpen = input<boolean>(false);
  readonly cartGroups = input<CartVendorGroup[]>([]);
  readonly deliveryFee = input<number>(1000); // Standard local delivery fee in FCFA

  readonly closeDrawer = output<void>();
  readonly updateQuantity = output<{ itemId: string; quantity: number }>();
  readonly removeItem = output<string>();
  readonly clearCart = output<void>();
  readonly proceedToCheckout = output<void>();

  // ─── Computed Properties ──────────────────────────────────────────
  readonly totalItemsCount = computed(() =>
    this.cartGroups().reduce(
      (acc, group) => acc + group.items.reduce((sum, item) => sum + item.quantity, 0),
      0
    )
  );

  readonly subtotal = computed(() =>
    this.cartGroups().reduce(
      (acc, group) =>
        acc +
        group.items.reduce((sum, item) => sum + item.price * item.quantity, 0),
      0
    )
  );

  readonly totalPrice = computed(() =>
    this.subtotal() > 0 ? this.subtotal() + this.deliveryFee() : 0
  );

  // ─── Handlers ─────────────────────────────────────────────────────
  onClose(): void {
    this.closeDrawer.emit();
  }

  onIncrement(item: CartItem): void {
    this.updateQuantity.emit({ itemId: item.id, quantity: item.quantity + 1 });
  }

  onDecrement(item: CartItem): void {
    if (item.quantity > 1) {
      this.updateQuantity.emit({ itemId: item.id, quantity: item.quantity - 1 });
    } else {
      this.removeItem.emit(item.id);
    }
  }

  onRemove(itemId: string): void {
    this.removeItem.emit(itemId);
  }

  onClear(): void {
    this.clearCart.emit();
  }

  onCheckout(): void {
    this.proceedToCheckout.emit();
  }
}
