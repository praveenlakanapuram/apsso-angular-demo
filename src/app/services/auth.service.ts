import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { SSOAuth } from '@ap-sso/auth-sdk';
import { environment } from '../../environments/environment.prod';

export interface UserPost {
  deptId?: string;
  deptName?: string;
  postId?: string;
  postName?: string;
  orgUnitId?: string;
  orgUnitName?: string;
  apcfssDistrictId?: string;
  apcfssDistrictName?: string;
  apcfssMandalId?: string;
  apcfssMandalName?: string;
}

export interface SSOUser {
  sub: string;
  cfmsId?: string;
  name: string;
  preferred_username: string;
  email?: string;
  avatar?: string | null;
  posts?: UserPost[];
  groups?: string[];
  isActive?: boolean;
  [key: string]: unknown;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private sso: SSOAuth;
  private autoLoginFlag = false;

  private userSubject = new BehaviorSubject<SSOUser | null>(null);
  user$ = this.userSubject.asObservable();

  private logsSubject = new BehaviorSubject<string[]>([]);
  logs$ = this.logsSubject.asObservable();

  /**
   * Check if we should automatically trigger the SSO login.
   * We check both the persistent flag and the current URL params.
   */
  shouldAutoLogin(): boolean {
    const urlParams = new URLSearchParams(window.location.search);
    return this.autoLoginFlag || urlParams.get('sso_login') === 'true';
  }

  constructor(private router: Router) {
    const urlParams = new URLSearchParams(window.location.search);
    const urlClientId = urlParams.get('sso_client_id');

    console.log('[DEBUG] window.location.search =', window.location.search);
    console.log('[DEBUG] urlClientId extracted =', urlClientId);

    if (urlClientId) {
      localStorage.setItem('sso_demo_client_id', urlClientId);
    }

    let cachedId = localStorage.getItem('sso_demo_client_id');
    if (cachedId && !cachedId.startsWith('sso_')) {
      localStorage.removeItem('sso_demo_client_id');
      cachedId = null;
    }

    const effectiveClientId = urlClientId || cachedId || environment.sso.clientId;

    this.autoLoginFlag = urlParams.get('sso_login') === 'true';

    this.sso = new SSOAuth({
      domain: environment.sso.domain,
      clientId: effectiveClientId,
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

    // --- Cross-Site Partitioning Fallback ---
    // Modern browsers (Safari, Chrome) isolate cross-site third-party iframes, meaning
    // the Front-Channel SLO iframe cannot directly modify our top-level tab's localStorage.
    // To sync correctly, when the user focuses on this tab, we verify the session still exists globally.
    const checkSessionState = async () => {
      if (this.isAuthenticated() && window === window.top) {
        // Authenticated: verify session is still valid with the server
        try {
          const token = await this.sso.getToken();
          if (!token) throw new Error('Token invalidated');
          
          const res = await fetch(`${environment.sso.authServiceUrl}/oauth/userinfo`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.status === 401) throw new Error('Global SSO Session Terminated');
        } catch (e) {
          this.log(`Session sync detected termination: ${(e as Error).message}`);
          localStorage.removeItem('sso_demo_user');
          localStorage.removeItem('sso_tokens');
          this.userSubject.next(null);
          this.router.navigate(['/login']);
        }
      } else if (!this.isAuthenticated() && window === window.top) {
        // Not authenticated — check if we WERE authenticated (cross-tab logout)
        if (this.userSubject.getValue() !== null) {
          // Another tab cleared localStorage — sync in-memory state
          this.log('Cross-tab logout detected — clearing session');
          this.userSubject.next(null);
          sessionStorage.setItem('sso_user_logged_out', 'true');
          this.router.navigate(['/login']);
          return;
        }

        // Check if an SSO session appeared (e.g., user logged into Launchpad in another tab)
        const wasLoggedOut = sessionStorage.getItem('sso_user_logged_out') === 'true';
        const noSession = sessionStorage.getItem('sso_no_session') === 'true';
        if (wasLoggedOut || noSession) {
          this.log('Tab focused while logged out — re-checking SSO session...');
          sessionStorage.removeItem('sso_user_logged_out');
          sessionStorage.removeItem('sso_no_session');
          sessionStorage.removeItem('sso_auto_redirect_ts');
          this.silentLogin();
        }
      }
    };

    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') checkSessionState();
    });
    window.addEventListener('focus', checkSessionState);

    // Instant cross-tab logout: 'storage' event fires when another tab modifies localStorage
    window.addEventListener('storage', (event) => {
      if (event.key === 'sso_tokens' && !event.newValue) {
        // Tokens were removed in another tab — logout immediately
        this.log('Cross-tab storage event: tokens cleared — logging out');
        localStorage.removeItem('sso_demo_user');
        this.userSubject.next(null);
        sessionStorage.setItem('sso_user_logged_out', 'true');
        this.router.navigate(['/login']);
      }
    });
  }

  login(): void {
    this.log('Initiating OAuth2/PKCE login via SDK...');
    this.log(`Domain: ${environment.sso.domain}`);
    this.log(`Client ID: ${environment.sso.clientId}`);
    this.log(`Redirect URI: ${environment.sso.redirectUri}`);
    this.log('Redirecting to SSO authorization page...');

    this.sso.platformLogin();
  }

  /**
   * Silent login: uses prompt=none to check for existing SSO session.
   * If SSO session exists → returns auth code silently (no UI).
   * If no SSO session → returns error=login_required (no login form shown).
   */
  async silentLogin(): Promise<void> {
    this.log('Attempting silent SSO session check (prompt=none)...');

    // Generate PKCE params manually (same as SDK does)
    const state = this.generateRandomString(32);
    const codeVerifier = this.generateRandomString(64);
    const codeChallenge = await this.generateCodeChallenge(codeVerifier);

    // Store in the same keys the SDK uses so platformHandleCallback works
    localStorage.setItem('sso_platform_state', state);
    localStorage.setItem('sso_platform_code_verifier', codeVerifier);

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.sso['config'].clientId,
      redirect_uri: this.sso['config'].redirectUri,
      scope: this.sso['config'].scopes.join(' '),
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      prompt: 'none',  // The key difference: don't show login form
      response_mode: 'fragment',  // Deliver code in URL fragment, not query params
    });

    const authServiceUrl = environment.sso.authServiceUrl;
    window.location.href = `${authServiceUrl}/oauth/authorize?${params}`;
  }

  // --- PKCE helpers (same as SDK) ---
  private generateRandomString(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, (b) => chars[b % chars.length]).join('');
  }

  private async generateCodeChallenge(verifier: string): Promise<string> {
    const encoder = new TextEncoder();
    const hashed = await crypto.subtle.digest('SHA-256', encoder.encode(verifier));
    const bytes = new Uint8Array(hashed);
    let str = '';
    bytes.forEach((b) => (str += String.fromCharCode(b)));
    return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }

  async handleCallback(): Promise<SSOUser> {
    this.log('SSO callback received - SDK is processing...');

    try {
      const tokens = await this.sso.platformHandleCallback();
      this.log('Tokens received from SDK!');
      this.log(`Access token: ${tokens.accessToken.substring(0, 25)}...`);
      this.log(`Refresh token: ${tokens.refreshToken?.substring(0, 25) || 'N/A'}...`);

      this.log('Fetching user profile via SDK...');
      const user = await this.sso.platformGetUserInfo() as SSOUser;

      this.log(`User authenticated: ${user.name} (${user.preferred_username || user.cfmsId})`);
      if (user.posts && user.posts.length > 0) {
        this.log(`Active Post: ${user.posts[0].postName || user.posts[0].postId}`);
        this.log(`Department: ${user.posts[0].deptName || 'N/A'}`);
      }

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
        this.log('No valid token returned - session may have expired.');
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
    localStorage.removeItem('sso_tokens');       // SDK's internal token storage
    localStorage.removeItem('sso_state');         // SDK's PKCE state
    localStorage.removeItem('sso_code_verifier'); // SDK's PKCE code verifier
    this.userSubject.next(null);

    // Prevent auto-redirect after explicit logout (cleared when user clicks Login)
    sessionStorage.setItem('sso_user_logged_out', 'true');

    this.log('Local session cleared');

    // If running in an iframe (e.g. OIDC Front-Channel Logout), don't redirect
    if (window !== window.top) {
      this.log('Running in iframe (Front-Channel SLO) - skipping redirect');
      return;
    }

    // Redirect to SSO logout, then back to /login (not root, to avoid auto-redirect loop)
    window.location.href = `${environment.sso.authServiceUrl}/oauth/logout?post_logout_redirect_uri=` +
      encodeURIComponent(window.location.origin + '/login');
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
