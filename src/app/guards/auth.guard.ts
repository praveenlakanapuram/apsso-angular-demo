import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated()) {
    return true;
  }

  // If user explicitly logged out, don't auto-redirect — show login page
  if (sessionStorage.getItem('sso_user_logged_out') === 'true') {
    console.log('[AuthGuard] User explicitly logged out — showing login page');
    router.navigate(['/login']);
    return false;
  }

  // SP-Initiated SSO: auto-redirect to the IdP, but prevent rapid loops.
  const lastAttempt = sessionStorage.getItem('sso_auto_redirect_ts');
  const now = Date.now();
  const cooldownMs = 5000;

  if (lastAttempt && (now - parseInt(lastAttempt, 10)) < cooldownMs) {
    console.log('[AuthGuard] SSO redirect attempted recently — showing login page');
    router.navigate(['/login']);
    return false;
  }

  // First attempt or cooldown expired — try auto-redirect to SSO
  console.log('[AuthGuard] No local session — initiating SP-initiated SSO redirect');
  sessionStorage.setItem('sso_auto_redirect_ts', now.toString());
  auth.login();
  return false;
};
