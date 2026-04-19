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
#    Edit: src/environments/environment.ts

# 3. Run the dev server
ng serve
# or
npm start
```

Open `http://localhost:4200` in your browser.

## How It Works

This demo implements **Model 3 - OAuth2/OIDC with PKCE** with **SP-Initiated SSO**:

1. **User opens the app** → No local session → Auth guard auto-redirects to SSO
2. **SSO checks session** → If user is already logged in (e.g., via Launchpad), tokens are issued silently — **no login form is shown**
3. **Callback** → SSO redirects back to `/auth/callback` → SDK exchanges the code for tokens
4. **Dashboard** → User lands directly on the dashboard, fully authenticated

> If the user has **no** active SSO session, they will be prompted to log in at the SSO platform. After authenticating, they are redirected back to the app.

## SP-Initiated SSO (Auto-Login)

This demo implements the **SP-Initiated SSO** pattern, which is the standard expected behavior for enterprise SSO:

**Scenario:** A user logs into the SSO Launchpad, then opens this application directly via URL (without clicking anything in the Launchpad).

**Expected behavior:** The user is authenticated automatically — no login form, no extra clicks.

### How it's implemented

Three key pieces make this work:

#### 1. Auth Guard (`auth.guard.ts`)

Instead of redirecting to a login page, the guard directly initiates the SSO redirect:

```typescript
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);

  if (auth.isAuthenticated()) {
    return true;
  }

  // SP-Initiated SSO: auto-redirect to the IdP instead of showing /login
  auth.login();
  return false;
};
```

#### 2. Default Route (`app.routes.ts`)

The default route points to `/dashboard` (not `/login`), so the auth guard runs immediately:

```typescript
{ path: '', redirectTo: 'dashboard', pathMatch: 'full' },
{ path: '**', redirectTo: 'dashboard' },
```

#### 3. Login Page (`login.component.ts`)

The login page auto-redirects to SSO on load. A "Connecting to SSO..." spinner is shown briefly. The manual login button is kept as a fallback:

```typescript
ngOnInit() {
  if (this.auth.isAuthenticated()) {
    this.router.navigate(['/dashboard']);
    return;
  }
  // Auto-redirect to SSO
  this.redirecting = true;
  setTimeout(() => this.loginWithSSO(), 500);
}
```

### Flow Diagram

```
User visits app URL
    │
    ├─ Has local session? ─── YES ──→ Dashboard ✅
    │
    └─ NO ──→ Auth guard redirects to SSO /authorize
                  │
                  ├─ Has SSO session? ─── YES ──→ Silent token issuance ──→ Dashboard ✅
                  │
                  └─ NO ──→ SSO login form ──→ User authenticates ──→ Dashboard ✅
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
│   │   ├── login/              # Auto-redirect page with fallback button
│   │   ├── callback/           # OAuth callback handler
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

Edit `src/environments/environment.ts`:

| Field | Description |
|-------|-------------|
| `domain` | SSO platform domain (e.g., `sso.ap.gov.in`) |
| `authServiceUrl` | Full base URL of the SSO auth service |
| `clientId` | Your registered OAuth client ID |
| `redirectUri` | Must match the redirect URI registered in the SSO admin |
| `scopes` | Space-separated OAuth scopes |

## Installing the SDK

The `.npmrc` file in this project points the `@ap-sso` scope to our private Nexus registry:

```
@ap-sso:registry=http://54.211.72.114:8081/repository/npm-hosted/
```

If `npm install` fails, ensure you can reach the Nexus server.
# apsso-angular-demo
