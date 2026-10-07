import { Injectable, signal } from '@angular/core';
import { environment } from '@environments/environment';

export type MapsState = 'idle' | 'loading' | 'loaded' | 'failed';

@Injectable({ providedIn: 'root' })
export class GoogleMapsLoaderService {

  private readonly _state = signal<MapsState>('idle');
  private inFlight: Promise<void> | null = null;

  readonly state = this._state.asReadonly();

  /**
   * Injects the Google Maps script if it hasn't been injected already.
   * At most one `<script>` tag exists on the page. Calling this again
   * returns the in-flight or resolved promise — never re-injects.
   */
  load(): Promise<void> {
    // Already loaded — nothing to do.
    if (this._state() === 'loaded') return Promise.resolve();

    // A load is already in flight — same promise.
    if (this.inFlight) return this.inFlight;

    // A previous attempt failed — do not auto-retry from here.
    // Only the guard can trigger a fresh attempt, and it will reset
    // the state before calling.
    if (this._state() === 'failed') return Promise.resolve();

    this._state.set('loading');
    this.inFlight = this.injectAndWait();
    return this.inFlight;
  }

  /**
   * Used only by the guard: gives one more shot when the previous
   * attempt failed. Resets the state to 'idle' first so load() will
   * actually run again. Creates one more `<script>` tag — this is
   * the last one this app will ever create.
   */
  retryOnce(): Promise<void> {
    if (this._state() === 'loaded') return Promise.resolve();
    this._state.set('idle');
    this.inFlight = null;
    return this.load();
  }

  /** Synchronous presence check. */
  isLoaded(): boolean {
    return typeof (window as any).google?.maps?.Map === 'function';
  }

  private injectAndWait(): Promise<void> {
    return new Promise<void>((resolve) => {
      // If the API is already present (cached from a previous
      // session, hot reload, etc.), we're done without touching
      // the DOM.
      if (this.isLoaded()) {
        this._state.set('loaded');
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src =
        'https://maps.googleapis.com/maps/api/js' +
        '?key=' + encodeURIComponent(environment.googleMapsApiKey) +
        '&libraries=places&loading=async&callback=__gmapsReady';
      script.async = true;
      script.defer = true;

      (window as any).__gmapsReady = () => {
        delete (window as any).__gmapsReady;
        this._state.set('loaded');
        resolve();
      };

      script.onerror = () => {
        delete (window as any).__gmapsReady;
        script.remove();
        this._state.set('failed');
        resolve();
      };

      setTimeout(() => {
        if (!this.isLoaded()) {
          script.remove();
          this._state.set('failed');
          resolve();
        }
      }, 10_000);

      document.head.appendChild(script);
      console.log(" google script loaded ");
    });
  }
}
