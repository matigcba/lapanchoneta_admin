import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent),
    canActivate: [authGuard]
  },
  {
    path: 'inventory',
    loadComponent: () => import('./pages/inventory/inventory.component').then(m => m.InventoryComponent),
    canActivate: [authGuard]
  },
  {
    path: 'stock',
    loadComponent: () => import('./pages/stock/stock.component').then(m => m.StockComponent),
    canActivate: [authGuard]
  },
  {
    path: 'employees',
    loadComponent: () => import('./pages/staff/staff.component').then(m => m.StaffComponent),
    canActivate: [authGuard]
  },
  {
    path: 'orders',
    loadComponent: () => import('./pages/orders/orders.component').then(m => m.OrdersComponent),
    canActivate: [authGuard]
  },
  {
    path: 'franchises',
    loadComponent: () => import('./pages/franchises/franchises.component').then(m => m.FranchisesComponent),
    canActivate: [authGuard]
  },
  {
    path: 'branches',
    loadComponent: () => import('./pages/branches/branches.component').then(m => m.BranchesComponent),
    canActivate: [authGuard]
  },
  {
    path: 'cash',
    loadComponent: () => import('./pages/cash/cash.component').then(m => m.CashComponent),
    canActivate: [authGuard]
  },
  {
    path: 'report-sales',
    loadComponent: () => import('./pages/report-sales/report-sales.component').then(m => m.ReportSalesComponent),
    canActivate: [authGuard]
  },
  {
    path: 'report-orders',
    loadComponent: () => import('./pages/report-orders/report-orders.component').then(m => m.ReportOrdersComponent),
    canActivate: [authGuard]
  },
  {
    path: 'coupons',
    loadComponent: () => import('./pages/coupons/coupons.component').then(m => m.CouponsComponent),
    canActivate: [authGuard]
  },
    {
    path: 'points',
    loadComponent: () => import('./pages/points/points.component').then(m => m.PointsComponent),
    canActivate: [authGuard]
  },
  {
    path: 'profile',
    loadComponent: () => import('./pages/profile/profile.component').then(m => m.ProfileComponent),
    canActivate: [authGuard]
  },
  {
    path: '**',
    redirectTo: 'dashboard'
  }
];
