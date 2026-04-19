import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated()) {
    return true;
  }

  // SP-Initiated SSO: auto-redirect to the IdP, but prevent rapid loops.
  // We store a timestamp of the last redirect attempt. If it was recent (< 5s),
  // it means SSO bounced us back without completing auth — show login page instead.
  const lastAttempt = sessionStorage.getItem('sso_auto_redirect_ts');
  const now = Date.now();
  const cooldownMs = 5000; // 5 seconds

  if (lastAttempt && (now - parseInt(lastAttempt, 10)) < cooldownMs) {
    // Recent redirect attempt — SSO didn't complete auth, fall back to login page
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
