import { Component, ChangeDetectionStrategy } from '@angular/core';

/**
 * Small pill badge shown next to the logo on all vendor-auth pages.
 *
 * Reads "Portail Vendeurs" and uses the brand's secondary (green) color
 * to visually distinguish the vendor portal from the public marketplace.
 *
 * No inputs, no logic — pure presentational.
 */
@Component({
  selector: 'app-vendor-portal-badge',
  standalone: true,
  imports: [],
  templateUrl: './vendor-portal-badge.component.html',
  styleUrl: './vendor-portal-badge.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VendorPortalBadgeComponent {}
