import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CommonModule } from '@angular/common';
import { environment } from '../../../environments/environment.prod';

@Component({
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  template: `
    <div class="login-wrapper">
      <mat-card class="login-card" appearance="outlined">
        <mat-card-header>
          <mat-card-title>AP SSO Demo</mat-card-title>
          <mat-card-subtitle>Model 3 - OAuth2 / OIDC with PKCE</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <!-- Auto-redirect state -->
          <div *ngIf="redirecting" class="auto-redirect">
            <mat-spinner diameter="32"></mat-spinner>
            <span>Connecting to SSO...</span>
            <p class="hint">You will be redirected automatically. If you already have an active SSO session, you'll be signed in without seeing a login form.</p>
          </div>

          <!-- Config info (shown when not auto-redirecting) -->
          <div *ngIf="!redirecting" class="config-list">
            <div class="config-item">
              <span class="config-label">Auth URL</span>
              <span class="config-value">{{ ssoConfig.authServiceUrl }}</span>
            </div>
            <div class="config-item">
              <span class="config-label">Client ID</span>
              <span class="config-value">{{ ssoConfig.clientId }}</span>
            </div>
            <div class="config-item">
              <span class="config-label">Redirect URI</span>
              <span class="config-value">{{ ssoConfig.redirectUri }}</span>
            </div>
          </div>
        </mat-card-content>
        <mat-card-actions>
          <button mat-flat-button color="primary" (click)="loginWithSSO()" class="login-btn">
            <mat-icon>login</mat-icon>
            Login with AP SSO
          </button>
        </mat-card-actions>
      </mat-card>
    </div>
  `,
  styles: [`
    .login-wrapper {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: #f5f5f5;
    }
    .login-card {
      width: 100%;
      max-width: 440px;
      margin: 24px;
    }
    .auto-redirect {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      padding: 24px 0;
      text-align: center;
      color: #555;
      font-size: 14px;
    }
    .auto-redirect .hint {
      font-size: 12px;
      color: #999;
      max-width: 320px;
      line-height: 1.5;
      margin: 0;
    }
    .config-list {
      margin-top: 16px;
    }
    .config-item {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #eee;
      font-size: 13px;
      gap: 16px;
    }
    .config-item:last-child { border-bottom: none; }
    .config-label {
      color: #666;
      white-space: nowrap;
    }
    .config-value {
      color: #333;
      font-family: monospace;
      font-size: 12px;
      word-break: break-all;
      text-align: right;
    }
    .login-btn {
      width: 100%;
      margin-top: 8px;
    }
    mat-card-actions {
      padding: 16px !important;
    }
  `],
})
export class LoginComponent implements OnInit {
  ssoConfig = environment.sso;
  redirecting = false;

  constructor(
    public auth: AuthService,
    private route: ActivatedRoute,
    private router: Router
  ) { }

  ngOnInit() {
    // If already authenticated, go straight to dashboard
    if (this.auth.isAuthenticated()) {
      console.log('[LoginComponent] User already authenticated, redirecting to dashboard');
      this.router.navigate(['/dashboard']);
      return;
    }

    // SP-Initiated SSO: auto-redirect to the IdP
    // If the user has an active SSO session, they'll be authenticated silently.
    // Show a brief loading state so the user knows what's happening.
    console.log('[LoginComponent] No local session — auto-redirecting to SSO (SP-initiated flow)');
    this.redirecting = true;

    // Small delay so the user sees "Connecting to SSO..." before the redirect occurs
    setTimeout(() => {
      this.loginWithSSO();
    }, 500);
  }

  loginWithSSO(): void {
    this.auth.login();
  }
}

