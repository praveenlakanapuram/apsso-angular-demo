# SSO Angular Demo

A **standalone, self-contained** Angular demo that integrates with the AP SSO platform using the official `@ap-sso/auth-sdk`.

> **Note:** This demo is designed to be given to vendors as-is. It has no dependencies on the SSO mono-repo

## Prerequisites

- Node.js 18+ and npm
- Access to the Nexus registry at `http://54.211.72.114:8081`
- A registered OAuth Client ID and Redirect URI from the SSO admin

## Quick Start

```bash
# 1. Install dependencies (SDK is pulled from Nexus via .npmrc)
npm install

# 2. Update environment config with your SSO settings
#    Edit: src/environments/environment.prod.ts

# 3. Run the dev server
ng serve
# or
npm start
```

Open `http://localhost:4200` in your browser.

## How It Works

This demo implements **Model 3 - OAuth2/OIDC with PKCE** with **SP-Initiated SSO**:

1. **User opens the app** → No local session → Auto-redirects to SSO
2. **SSO checks session** → If user is already logged in (e.g., via Launchpad), tokens are issued silently — **no login form is shown**
3. **Callback** → SSO redirects back to `/auth/callback` → SDK exchanges the code for tokens
4. **Dashboard** → User lands directly on the dashboard, fully authenticated

> If the user has **no** active SSO session, they will be prompted to log in at the SSO platform. After authenticating, they are redirected back to the app.

## SP-Initiated SSO (Auto-Login)

This demo implements the **SP-Initiated SSO** pattern, which is the standard expected behavior for enterprise SSO.

**Scenario:** A user logs into the SSO Launchpad, then opens this application directly via URL (without clicking anything in the Launchpad).

**Expected behavior:** The user is authenticated automatically — no login form, no extra clicks.

### How it's implemented

#### 1. Auth Guard (`auth.guard.ts`)

The guard auto-redirects to SSO when no local session exists. A **5-second cooldown** prevents redirect loops (e.g., if SSO bounces back without completing auth):

```typescript
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated()) return true;

  // Cooldown: prevent rapid redirect loops
  const lastAttempt = sessionStorage.getItem('sso_auto_redirect_ts');
  const now = Date.now();
  if (lastAttempt && (now - parseInt(lastAttempt, 10)) < 5000) {
    router.navigate(['/login']); // Fallback to manual login
    return false;
  }

  // SP-Initiated SSO: auto-redirect to the IdP
  sessionStorage.setItem('sso_auto_redirect_ts', now.toString());
  auth.login();
  return false;
};
```

#### 2. Login Page (`login.component.ts`)

The login page also auto-redirects using the same cooldown logic. If the cooldown is active (e.g., just after logout), it shows the manual "Login with AP SSO" button as a fallback:

```typescript
ngOnInit() {
  if (this.auth.isAuthenticated()) {
    this.router.navigate(['/dashboard']);
    return;
  }

  // Auto-redirect if cooldown expired
  const lastAttempt = sessionStorage.getItem('sso_auto_redirect_ts');
  const now = Date.now();
  if (!lastAttempt || (now - parseInt(lastAttempt, 10)) > 5000) {
    sessionStorage.setItem('sso_auto_redirect_ts', now.toString());
    this.auth.login();
  }
}
```

#### 3. Routes (`app.routes.ts`)

The default route points to `/dashboard` (protected by the auth guard). All protected routes should use `canActivate: [authGuard]`:

```typescript
export const routes: Routes = [
  { path: 'auth/callback', ... },   // Public: OAuth callback
  { path: 'auth/logout', ... },     // Public: Logout handler
  { path: 'dashboard', ..., canActivate: [authGuard] },  // Protected
  { path: 'login', ... },           // Public: Fallback login page
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: '**', redirectTo: 'dashboard' },
];
```

> **Tip for vendors with many routes:** Use a parent route to protect all children with a single guard:
> ```typescript
> {
>   path: '',
>   canActivate: [authGuard],
>   children: [
>     { path: 'dashboard', ... },
>     { path: 'settings', ... },
>     { path: 'reports', ... },
>     // All protected automatically — no need to add authGuard to each
>   ],
> }
> ```

#### 4. Logout (`auth.service.ts`)

During logout, the SDK tokens (`sso_tokens`) must be cleared alongside your app's session data. A cooldown timestamp is set to prevent auto-redirect immediately after logout:

```typescript
async logout() {
  // Revoke tokens on server...

  // Clear ALL token storage
  localStorage.removeItem('sso_demo_user');
  localStorage.removeItem('sso_tokens');       // SDK's internal tokens
  localStorage.removeItem('sso_state');         // SDK's PKCE state
  localStorage.removeItem('sso_code_verifier'); // SDK's PKCE verifier

  // Prevent auto-redirect immediately after logout
  sessionStorage.setItem('sso_auto_redirect_ts', Date.now().toString());

  // Redirect to SSO logout, then back to /login
  window.location.href = `${authServiceUrl}/oauth/logout?post_logout_redirect_uri=` +
    encodeURIComponent(window.location.origin + '/login');
}
```

### Flow Diagram

```
User visits any app URL
    │
    ├─ Has local session? ─── YES ──→ Dashboard ✅
    │
    └─ NO ──→ Cooldown active? (<5s since last attempt)
                  │
                  ├─ YES ──→ Show login page with manual button
                  │
                  └─ NO ──→ Auto-redirect to SSO /authorize
                                │
                                ├─ Has SSO session? ─── YES ──→ Silent auth ──→ Dashboard ✅
                                │
                                └─ NO ──→ SSO login form ──→ Authenticate ──→ Dashboard ✅

User clicks Logout
    │
    └─ Clear all tokens + set cooldown ──→ SSO logout ──→ /login page (manual button)
        │
        └─ After 5s, refreshing any URL will auto-redirect again ✅
```

## Project Structure

```
src/
├── environments/
│   └── environment.prod.ts     # SSO configuration (domain, clientId, etc.)
├── app/
│   ├── services/
│   │   └── auth.service.ts     # Angular wrapper around @ap-sso/auth-sdk
│   ├── guards/
│   │   └── auth.guard.ts       # Route guard — auto-redirects to SSO (SP-initiated)
│   ├── pages/
│   │   ├── login/              # Fallback login page with manual button
│   │   ├── callback/           # OAuth callback handler
│   │   ├── logout/             # Front-channel logout handler
│   │   └── dashboard/          # Authenticated user dashboard
│   ├── app.routes.ts           # Routes — defaults to /dashboard (guard handles auth)
│   ├── app.config.ts           # App providers
│   └── app.ts                  # Root component
├── styles.css                  # Global styles
└── .npmrc                      # Nexus registry for @ap-sso scope
```

## SDK Usage

The entire SSO integration is handled by the SDK. The Angular `AuthService` is a thin wrapper:

```typescript
import { SSOAuth } from '@ap-sso/auth-sdk';

// Initialize
const sso = new SSOAuth({
  domain: 'sso.ap.gov.in',
  clientId: 'your-client-id',
  redirectUri: 'http://localhost:4200/auth/callback',
  scopes: ['openid', 'profile', 'email', 'roles', 'department'],
  authServiceUrl: 'https://sso.ap.gov.in',
});

// Login → redirects to SSO
sso.platformLogin();

// Handle callback (on /auth/callback page)
const tokens = await sso.platformHandleCallback();

// Get user info
const user = await sso.platformGetUserInfo();

// Get access token (auto-refreshes if expired)
const token = await sso.getToken();

// Logout
sso.platformLogout();
```

## Configuration

Edit `src/environments/environment.prod.ts`:

| Field | Description |
|-------|-------------|
| `domain` | SSO platform domain (e.g., `sso.ap.gov.in`) |
| `authServiceUrl` | Full base URL of the SSO auth service (e.g., `https://sso.ap.gov.in`) |
| `clientId` | Your registered OAuth client ID |
| `redirectUri` | Must match the redirect URI registered in the SSO admin |
| `scopes` | Space-separated OAuth scopes |

## Installing the SDK

The `.npmrc` file in this project points the `@ap-sso` scope to our private Nexus registry:

```
@ap-sso:registry=http://54.211.72.114:8081/repository/npm-hosted/
```

If `npm install` fails, ensure you can reach the Nexus server.
