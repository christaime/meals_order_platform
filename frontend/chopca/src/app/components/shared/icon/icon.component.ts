import { Component, computed, input } from '@angular/core';

/**
 * Material Symbols icon.
 *
 * Usage:
 *   <app-icon name="star" />
 *   <app-icon name="star" [filled]="true" size="lg" />
 *   <app-icon name="favorite" [filled]="true" size="sm" />
 */
@Component({
  selector: 'app-icon',
  standalone: true,
  imports: [],
  templateUrl: './icon.component.html',
  styleUrl: './icon.component.scss',
})
export class IconComponent {

  /** The icon name (Material Symbols identifier). */
  readonly name = input.required<string>();

  /** Whether the icon is filled (Material Symbols FILL=1). */
  readonly filled = input<boolean>(false);

  /** Size: 'sm' (16px), 'md' (20px, default), 'lg' (24px), 'xl' (32px). */
  readonly size = input<'sm' | 'md' | 'lg' | 'xl'>('md');

  /** Optional CSS class(es) appended to the host. */
  readonly extraClass = input<string>('', { alias: 'class' });

  /** Computed font-variation-settings based on filled. */
  protected readonly fillValue = computed(() => (this.filled() ? 1 : 0));

  /** Computed size class. */
  protected readonly sizeClass = computed(() => `icon-${this.size()}`);
}
