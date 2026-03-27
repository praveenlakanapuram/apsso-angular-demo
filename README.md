# SSO Angular Demo — Model 3 (OAuth2/OIDC)

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

This demo implements **Model 3 — OAuth2/OIDC with PKCE**:

1. **Login Page** — Click "Login with AP SSO" → SDK redirects to the SSO authorization page
2. **SSO Login** — User authenticates on the SSO platform
3. **Callback** — SSO redirects back to `/auth/callback` → SDK exchanges the code for tokens
4. **Dashboard** — Shows the authenticated user's profile, tokens, and SDK action buttons

## Project Structure

```
src/
├── environments/
│   └── environment.prod.ts     # Production config
├── app/
│   ├── services/
│   │   └── auth.service.ts     # Angular wrapper around @ap-sso/auth-sdk
│   ├── guards/
│   │   └── auth.guard.ts       # Route guard (redirects to /login if not authenticated)
│   ├── pages/
│   │   ├── login/              # Login page with SSO button
│   │   ├── callback/           # OAuth callback handler
│   │   └── dashboard/          # Authenticated user dashboard
│   ├── app.routes.ts           # Routing config
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
