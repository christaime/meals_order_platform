import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { GoogleMapsLoaderService } from '@core/services/google-maps-loader.service';

/**
 * A fallback for the case where a Maps route is reached before the
 * app initializer's load attempt finished (or before it started).
 *
 * - If the state is 'loaded': pass through.
 * - If the state is 'loading': wait for the in-flight promise.
 * - If the state is 'idle': the initializer hasn't fired — call load().
 * - If the state is 'failed': try exactly once more. If that fails,
 *   let navigation through; the component will show its warning.
 *
 * Never blocks navigation longer than the time it takes for one
 * in-flight load to settle.
 */
export const mapsPreloadGuard: CanActivateFn = async () => {
  const loader = inject(GoogleMapsLoaderService);
  const state = loader.state();

  if (state === 'loaded') return true;

  if (state === 'loading') {
    await loader.load();
    return true;
  }

  if (state === 'idle') {
    // Initializer didn't fire (unlikely) — start the load now.
    await loader.load();
    return true;
  }

  // state === 'failed': one retry, then let the user through either way.
  await loader.retryOnce();
  return true;
};
