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

  // If a silent check already failed (no SSO session), show login page
  if (sessionStorage.getItem('sso_no_session') === 'true') {
    console.log('[AuthGuard] No SSO session detected — showing login page');
    router.navigate(['/login']);
    return false;
  }

  // SP-Initiated SSO: silent check for existing SSO session (prompt=none).
  // Prevent rapid loops with a cooldown.
  const lastAttempt = sessionStorage.getItem('sso_auto_redirect_ts');
  const now = Date.now();
  const cooldownMs = 5000;

  if (lastAttempt && (now - parseInt(lastAttempt, 10)) < cooldownMs) {
    console.log('[AuthGuard] SSO redirect attempted recently — showing login page');
    router.navigate(['/login']);
    return false;
  }

  // Try silent session check — if SSO has session, user logs in silently.
  // If not, callback will set sso_no_session flag and show login page.
  console.log('[AuthGuard] Checking for SSO session (silent, prompt=none)...');
  sessionStorage.setItem('sso_auto_redirect_ts', now.toString());
  auth.silentLogin();
  return false;
};
