import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * VendorCardSkeletonComponent — Loading skeleton placeholder for VendorCardComponent.
 * Matches layout dimensions and structure during asynchronous vendor data fetches.
 */
@Component({
  selector: 'app-vendor-card-skeleton',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './vendor-card-skeleton.component.html',
  styleUrl: './vendor-card-skeleton.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VendorCardSkeletonComponent {}
