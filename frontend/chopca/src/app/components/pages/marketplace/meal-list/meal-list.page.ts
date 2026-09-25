import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  OnInit,
  DestroyRef,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CurrencyPipe } from '@angular/common';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';

import { MEAL_SERVICE } from '@app/core/services/marketplace/meal.service';
import { MealSummary, MealSearchRequest } from '@app/core/models/marketplace';

/**
 * Vendor meal list page.
 *
 * Route: /vendor/meals
 *
 * Uses MealService.search() — the API service resolves the base URL
 * from the current role, so vendors hit /vendor/meals automatically.
 */
@Component({
  selector: 'app-meal-list-page',
  standalone: true,
  imports: [
    RouterLink,
    CurrencyPipe,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatChipsModule,
  ],
  templateUrl: './meal-list.page.html',
  styleUrl: './meal-list.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MealListPageComponent implements OnInit {

  private readonly mealService = inject(MEAL_SERVICE);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly meals = signal<MealSummary[]>([]);
  protected readonly loading = signal<boolean>(true);
  protected readonly error = signal<string | null>(null);

  ngOnInit(): void {
    const request: MealSearchRequest = { page: 0, size: 100 };

    this.mealService
      .search(request)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (page) => {
          this.meals.set(page.content);
          this.loading.set(false);
        },
        error: (err) => {
          console.error('[MealListPage] load error', err);
          this.error.set(
            err?.error?.message ?? 'Impossible de charger vos plats.'
          );
          this.loading.set(false);
        },
      });
  }
}
