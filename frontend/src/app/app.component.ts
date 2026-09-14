import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  template: `
    <header class="bg-white shadow-sm">
      <div class="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
        <h1 class="text-2xl font-bold text-orange-600">🍽️ MealMarketplace</h1>
        <nav class="space-x-4">
          <a href="/marketplace" class="text-gray-600 hover:text-orange-600 font-medium">Marketplace</a>
          <a href="/vendor-admin" class="text-gray-600 hover:text-orange-600 font-medium">Vendor Dashboard</a>
          <a href="/payment/cart" class="text-gray-600 hover:text-orange-600 font-medium">Cart</a>
        </nav>
      </div>
    </header>
    <main class="max-w-7xl mx-auto px-4 py-6">
      <router-outlet></router-outlet>
    </main>
  `
})
export class AppComponent {}
