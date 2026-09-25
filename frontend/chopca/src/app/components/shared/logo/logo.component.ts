import { Component, ChangeDetectionStrategy, input } from '@angular/core';

export type LogoVariant = 'full' | 'mark';
export type LogoSize = 'sm' | 'md' | 'lg' | 'xl';

/**
 * Chop ça! brand logo.
 *
 * Renders one of two SVG lockups:
 * - 'full': the wordmark + pot + steam (header, footer)
 * - 'mark': the pot + steam only (favicon, tight spaces)
 *
 * Sizes map to fixed heights so the logo scales consistently
 * without breaking its aspect ratio.
 *
 * The SVG is inlined in the template so it can be styled, animated,
 * and recolored via CSS if needed later. No extra HTTP requests.
 */
@Component({
  selector: 'app-logo',
  standalone: true,
  imports: [],
  templateUrl: './logo.component.html',
  styleUrl: './logo.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LogoComponent {

  /** Which lockup to render. */
  readonly variant = input<LogoVariant>('full');

  /** Visual size. */
  readonly size = input<LogoSize>('md');

  /** Accessible label for screen readers. */
  readonly label = input<string>('Chop ça!');
}
