import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { UserContext } from '../../models/auth/user-context.model';
import { environment } from '@environments/environment';

@Injectable({ providedIn: 'root' })
export class UserContextService {
  private readonly http = inject(HttpClient);

  private readonly _context = signal<UserContext | null>(null);
  private readonly _loading = signal(false);

  readonly context = this._context.asReadonly();
  readonly loading = this._loading.asReadonly();

  readonly vendor = computed(() => this._context()?.vendor ?? null);
  readonly customer = computed(() => this._context()?.customer ?? null);
  readonly admin = computed(() => this._context()?.admin ?? null);

  readonly hasVendor = computed(() => this.vendor() !== null);
  readonly hasCustomer = computed(() => this.customer() !== null);
  readonly hasAdmin = computed(() => this.admin() !== null);

  /** Loads context if not already loaded. Safe to call on every navigation. */
  async ensureLoaded(): Promise<UserContext | null> {
    if (this._context() !== null) return this._context();
    return this.reload();
  }

  /** Forces a fresh fetch. Use after role changes or after registration. */
  async reload(): Promise<UserContext | null> {
    this._loading.set(true);
    try {
      const ctx = await firstValueFrom(
        this.http.get<UserContext>(`${environment.apiUrl}/reference/context`)
      );
      this._context.set(ctx);
      return ctx;
    } catch (e) {
      this._context.set(null);
      throw e;
    } finally {
      this._loading.set(false);
    }
  }

  clear(): void {
    this._context.set(null);
  }
}
