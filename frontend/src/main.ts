import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter, Routes } from '@angular/router';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { AppComponent } from './app/app.component';
import { Component } from '@angular/core';

@Component({
  selector: 'app-marketplace',
  standalone: true,
  template: `<div class="p-6 bg-white rounded-lg shadow"><h2 class="text-xl font-bold mb-4">Explore Meals & Vendors</h2><p class="text-gray-600">Browse delicious meals from multiple verified vendors.</p></div>`
})
class MarketplaceComponent {}

@Component({
  selector: 'app-vendor-dashboard',
  standalone: true,
  template: `<div class="p-6 bg-white rounded-lg shadow"><h2 class="text-xl font-bold mb-4">Vendor Dashboard</h2><p class="text-gray-600">Manage your menu items, track orders, and view sales analytics.</p></div>`
})
class VendorDashboardComponent {}

@Component({
  selector: 'app-cart-view',
  standalone: true,
  template: `<div class="p-6 bg-white rounded-lg shadow"><h2 class="text-xl font-bold mb-4">Your Shopping Cart</h2><p class="text-gray-600">Review selected meals and proceed to checkout.</p></div>`
})
class CartViewComponent {}

const routes: Routes = [
  { path: 'marketplace', component: MarketplaceComponent },
  { path: 'vendor-admin', component: VendorDashboardComponent },
  { path: 'payment/cart', component: CartViewComponent },
  { path: '', redirectTo: 'marketplace', pathMatch: 'full' }
];

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptorsFromDi())
  ]
}).catch(err => console.error(err));
