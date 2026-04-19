import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { environment } from '../../../environments/environment.prod';

@Component({
  standalone: true,
  imports: [MatCardModule, MatButtonModule, MatIconModule],
  template: `
    <div class="login-wrapper">
      <mat-card class="login-card" appearance="outlined">
        <mat-card-header>
          <mat-card-title>AP SSO Demo</mat-card-title>
          <mat-card-subtitle>Model 3 - OAuth2 / OIDC with PKCE</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <div class="config-list">
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

  constructor(
    public auth: AuthService,
    private router: Router
  ) { }

  ngOnInit() {
    // If already authenticated, go straight to dashboard
    if (this.auth.isAuthenticated()) {
      this.router.navigate(['/dashboard']);
    }
  }

  loginWithSSO(): void {
    // Clear the auto-redirect flag so the guard can try again next time
    sessionStorage.removeItem('sso_auto_redirect_attempted');
    this.auth.login();
  }
}
