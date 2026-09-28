
export type StoreKey = 'return_url';
export const RETURN_URL_KEY = 'return_url';

export const AppSessionStore = {
  set(key: StoreKey, value: string): void {
    sessionStorage.setItem(key, value);
  },

  get(key: StoreKey): string | null {
    const raw = sessionStorage.getItem(key);
    return raw ;
  },

  consume(key: StoreKey): string | null {
    const raw = sessionStorage.getItem(key);
    sessionStorage.removeItem(key);
    return raw;
  },

  clear(key: StoreKey): void {
    sessionStorage.removeItem(key);
  },
};
