export type StoreKey = 'return_url' | 'idpHint';
export const RETURN_URL_KEY = 'return_url';
export const IDP_HINT_KEY = 'idpHint';

/**
 * Session-scoped key-value store.
 *
 * Backed by `sessionStorage`, so entries survive page reloads within
 * the same tab but are cleared when the tab closes.
 *
 * Not injectable — import and call directly. The API is intentionally
 * minimal so it stays a low-level utility, not a service with behavior.
 */
export const AppSessionStore = {
  set(key: StoreKey, value: string): void {
    sessionStorage.setItem(key, value);
  },

  get(key: StoreKey): string | null {
    return sessionStorage.getItem(key);
  },

  /** Read once and remove — use for one-shot values like the return URL. */
  consume(key: StoreKey): string | null {
    const raw = sessionStorage.getItem(key);
    sessionStorage.removeItem(key);
    return raw;
  },

  clear(key: StoreKey): void {
    sessionStorage.removeItem(key);
  },
};
