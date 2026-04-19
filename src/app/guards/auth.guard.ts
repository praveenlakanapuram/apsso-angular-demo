import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated()) {
    return true;
  }

  // SP-Initiated SSO: attempt auto-redirect to the IdP, but only once.
  // If we've already attempted and returned (e.g., SSO bounced back without
  // completing auth), fall back to the login page with the manual button.
  const hasAttempted = sessionStorage.getItem('sso_auto_redirect_attempted');

  if (!hasAttempted) {
    console.log('[AuthGuard] No local session — initiating SP-initiated SSO redirect');
    sessionStorage.setItem('sso_auto_redirect_attempted', 'true');
    auth.login();
    return false;
  }

  // Already attempted once — fall back to login page with manual button
  console.log('[AuthGuard] SSO auto-redirect already attempted — showing login page');
  router.navigate(['/login']);
  return false;
};
