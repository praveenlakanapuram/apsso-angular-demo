import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);

  if (auth.isAuthenticated()) {
    return true;
  }

  // SP-Initiated SSO: auto-redirect to the IdP instead of showing /login
  console.log('[AuthGuard] No local session — initiating SP-initiated SSO redirect');
  auth.login();
  return false;
};
