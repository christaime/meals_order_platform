import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * MealCardSkeletonComponent — Visual loading placeholder for MealCardComponent.
 * Matches the layout dimensions and structure of the actual card during async data fetching.
 */
@Component({
  selector: 'app-meal-card-skeleton',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './meal-card-skeleton.component.html',
  styleUrl: './meal-card-skeleton.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MealCardSkeletonComponent {}
