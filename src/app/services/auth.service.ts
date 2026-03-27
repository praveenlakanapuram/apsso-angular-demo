import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { SSOAuth } from '@ap-sso/auth-sdk';
import { environment } from '../../environments/environment.prod';

export interface SSOUser {
  sub: string;
  name: string;
  preferred_username: string;
  email: string;
  role?: string;
  deptId?: string | null;
  deptName?: string | null;
  postId?: string | null;
  postName?: string | null;
  apcfssDistrictId?: string | null;
  apcfssDistrictName?: string | null;
  [key: string]: unknown;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private sso: SSOAuth;

  private userSubject = new BehaviorSubject<SSOUser | null>(null);
  user$ = this.userSubject.asObservable();

  private logsSubject = new BehaviorSubject<string[]>([]);
  logs$ = this.logsSubject.asObservable();

  constructor(private router: Router) {
    this.sso = new SSOAuth({
      domain: environment.sso.domain,
      clientId: environment.sso.clientId,
      redirectUri: environment.sso.redirectUri,
      scopes: environment.sso.scopes.split(' '),
      authServiceUrl: environment.sso.authServiceUrl,
    });

    const stored = localStorage.getItem('sso_demo_user');
    if (stored) {
      try {
        this.userSubject.next(JSON.parse(stored));
      } catch { /* ignore corrupt storage */ }
    }
  }

  login(): void {
    this.log('Initiating OAuth2/PKCE login via SDK...');
    this.log(`Domain: ${environment.sso.domain}`);
    this.log(`Client ID: ${environment.sso.clientId}`);
    this.log(`Redirect URI: ${environment.sso.redirectUri}`);
    this.log('Redirecting to SSO authorization page...');

    this.sso.platformLogin();
  }

  async handleCallback(): Promise<SSOUser> {
    this.log('SSO callback received — SDK is processing...');

    try {
      const tokens = await this.sso.platformHandleCallback();
      this.log('Tokens received from SDK!');
      this.log(`Access token: ${tokens.accessToken.substring(0, 25)}...`);
      this.log(`Refresh token: ${tokens.refreshToken?.substring(0, 25) || 'N/A'}...`);

      this.log('Fetching user profile via SDK...');
      const user = await this.sso.platformGetUserInfo() as SSOUser;

      this.log(`User authenticated: ${user.name} (${user.preferred_username})`);
      this.log(`Department: ${user.deptName || 'N/A'}`);
      this.log(`Role: ${user.role || 'N/A'}`);

      localStorage.setItem('sso_demo_user', JSON.stringify(user));
      this.userSubject.next(user);

      return user;
    } catch (err: any) {
      this.log(`Authentication failed: ${err.message}`);
      throw err;
    }
  }

  async refreshToken(): Promise<void> {
    this.log('Refreshing access token via SDK...');
    try {
      const token = await this.sso.getToken();
      if (token) {
        this.log(`Token refreshed: ${token.substring(0, 25)}...`);
      } else {
        this.log('No valid token returned — session may have expired.');
      }
    } catch (err: any) {
      this.log(`Token refresh failed: ${err.message}`);
      throw err;
    }
  }

  async getAccessToken(): Promise<string | null> {
    return this.sso.getToken();
  }

  async logout(): Promise<void> {
    this.log('Logging out...');

    try {
      const token = await this.sso.getToken();
      if (token) {
        this.log('Revoking tokens on the server (POST /auth/logout)...');
        await fetch(`${environment.sso.authServiceUrl}/auth/logout`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        this.log('Server-side tokens revoked');
      }
    } catch (err: any) {
      this.log(`Token revocation failed (proceeding anyway): ${err.message}`);
    }

    localStorage.removeItem('sso_demo_user');
    this.userSubject.next(null);
    this.log('Local session cleared');

    this.sso.logout(window.location.origin + '/login');
  }

  isAuthenticated(): boolean {
    return this.sso.isAuthenticated();
  }

  clearLogs(): void {
    this.logsSubject.next([]);
  }

  private log(message: string): void {
    const timestamp = new Date().toLocaleTimeString();
    const current = this.logsSubject.value;
    this.logsSubject.next([...current, `[${timestamp}] ${message}`]);
  }
}
