import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: 'auth/callback',
    loadComponent: () =>
      import('./pages/callback/callback.component').then((m) => m.CallbackComponent),
  },
  {
    path: 'auth/logout',
    loadComponent: () =>
      import('./pages/logout/logout.component').then((m) => m.LogoutComponent),
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./pages/dashboard/dashboard.component').then((m) => m.DashboardComponent),
    canActivate: [authGuard],
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/login/login.component').then((m) => m.LoginComponent),
  },
  // Default: go to dashboard — the authGuard will auto-redirect to SSO if no session
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: '**', redirectTo: 'dashboard' },
];
