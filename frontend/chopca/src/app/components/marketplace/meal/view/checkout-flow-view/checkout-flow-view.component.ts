import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent, PriceTagComponent } from '@components/shared';
import { CartVendorGroup } from '../cart-drawer/cart-drawer.component';

export interface DeliveryAddress {
  readonly id: string;
  readonly label: string;
  readonly fullAddress: string;
  readonly city: string;
  readonly phone: string;
  readonly isDefault?: boolean;
}

export type PaymentMethodType = 'MTN_MOMO' | 'ORANGE_MONEY' | 'CREDIT_CARD' | 'CASH_ON_DELIVERY';

export interface PaymentOption {
  readonly id: PaymentMethodType;
  readonly name: string;
  readonly iconName: string;
  readonly description: string;
}

@Component({
  selector: 'app-checkout-flow-view',
  standalone: true,
  imports: [CommonModule, IconComponent, PriceTagComponent],
  templateUrl: './checkout-flow-view.component.html',
  styleUrl: './checkout-flow-view.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CheckoutFlowViewComponent {
  // ─── Inputs & Outputs ──────────────────────────────────────────────
  readonly cartGroups = input<CartVendorGroup[]>([]);
  readonly addresses = input<DeliveryAddress[]>([]);
  readonly deliveryFee = input<number>(1000);
  readonly isSubmitting = input<boolean>(false);

  readonly placeOrder = output<{
    addressId: string;
    paymentMethod: PaymentMethodType;
    paymentPhone?: string;
    instructions?: string;
    totalAmount: number;
  }>();

  // ─── Local State Signals ──────────────────────────────────────────
  readonly selectedAddressId = signal<string>('');
  readonly selectedPaymentMethod = signal<PaymentMethodType>('MTN_MOMO');
  readonly mobileMoneyNumber = signal<string>('');
  readonly deliveryInstructions = signal<string>('');

  readonly paymentOptions: PaymentOption[] = [
    {
      id: 'MTN_MOMO',
      name: 'MTN Mobile Money',
      iconName: 'phone_android',
      description: 'Paiement direct via compte MTN MoMo',
    },
    {
      id: 'ORANGE_MONEY',
      name: 'Orange Money',
      iconName: 'smartphone',
      description: 'Paiement direct via compte Orange Money',
    },
    {
      id: 'CASH_ON_DELIVERY',
      name: 'Paiement à la livraison',
      iconName: 'payments',
      description: 'Règlement en espèces dès réception',
    },
    {
      id: 'CREDIT_CARD',
      name: 'Carte Bancaire',
      iconName: 'credit_card',
      description: 'Visa / Mastercard',
    },
  ];

  // ─── Computed Calculations ────────────────────────────────────────
  readonly subtotal = computed(() => {
    return this.cartGroups().reduce((accGroup, group) => {
      const groupSum = group.items.reduce((accItem, item) => accItem + item.price * item.quantity, 0);
      return accGroup + groupSum;
    }, 0);
  });

  readonly totalAmount = computed(() => this.subtotal() + this.deliveryFee());

  readonly effectiveAddressId = computed(() => {
    if (this.selectedAddressId()) return this.selectedAddressId();
    const defaultAddr = this.addresses().find((a) => a.isDefault);
    return defaultAddr ? defaultAddr.id : this.addresses()[0]?.id || '';
  });

  // ─── Handlers ─────────────────────────────────────────────────────
  onSelectAddress(addressId: string): void {
    this.selectedAddressId.set(addressId);
  }

  onSelectPayment(method: PaymentMethodType): void {
    this.selectedPaymentMethod.set(method);
  }

  onPhoneInput(event: Event): void {
    const inputEl = event.target as HTMLInputElement;
    this.mobileMoneyNumber.set(inputEl.value);
  }

  onInstructionsInput(event: Event): void {
    const inputEl = event.target as HTMLInputElement;
    this.deliveryInstructions.set(inputEl.value);
  }

  onSubmitOrder(): void {
    if (!this.effectiveAddressId()) return;

    this.placeOrder.emit({
      addressId: this.effectiveAddressId(),
      paymentMethod: this.selectedPaymentMethod(),
      paymentPhone: this.mobileMoneyNumber(),
      instructions: this.deliveryInstructions(),
      totalAmount: this.totalAmount(),
    });
  }
}
