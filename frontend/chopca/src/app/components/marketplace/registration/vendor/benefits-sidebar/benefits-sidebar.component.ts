import { Component, ChangeDetectionStrategy } from '@angular/core';
import { IconComponent } from '@components/shared/icon/icon.component';

/**
 * Marketing sidebar shown next to the vendor registration form:
 * - "Pourquoi rejoindre Chop ça!" benefit list
 * - A verified-partner chef testimonial
 *
 * Fully static. No inputs, no state. The testimonial and benefits
 * are part of the product copy — if they change, change them here.
 */
@Component({
  selector: 'app-benefits-sidebar',
  standalone: true,
  imports: [IconComponent],
  templateUrl: './benefits-sidebar.component.html',
  styleUrl: './benefits-sidebar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BenefitsSidebarComponent {}
