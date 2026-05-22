import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';

@Component({
  standalone: true,
  imports: [MatCardModule, MatProgressSpinnerModule, MatButtonModule],
  template: `
    <div class="callback-wrapper">
      <mat-card class="callback-card" appearance="outlined">
        @if (!error) {
          <mat-card-content class="loading-state">
            <mat-spinner diameter="40"></mat-spinner>
            <h3>Completing login...</h3>
            <p>Exchanging auth code for tokens.</p>
          </mat-card-content>
        } @else {
          <mat-card-content class="error-state">
            <h3>Login Failed</h3>
            <p>{{ error }}</p>
          </mat-card-content>
          <mat-card-actions>
            <button mat-stroked-button (click)="retry()">Back to Login</button>
          </mat-card-actions>
        }
      </mat-card>
    </div>
  `,
  styles: [`
    .callback-wrapper {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: #f5f5f5;
    }
    .callback-card {
      width: 100%;
      max-width: 400px;
      margin: 24px;
      text-align: center;
    }
    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      padding: 32px 16px;
    }
    .loading-state h3 { margin: 0; }
    .loading-state p { margin: 0; color: #666; font-size: 14px; }
    .error-state { padding: 24px 16px; }
    .error-state h3 { margin: 0 0 8px; color: #d32f2f; }
    .error-state p { margin: 0; color: #666; font-size: 14px; }
    mat-card-actions { padding: 16px !important; }
  `],
})
export class CallbackComponent implements OnInit {
  error: string | null = null;

  constructor(
    private router: Router,
    private auth: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit() {
    // Check for prompt=none silent check failure (no SSO session)
    // Params may arrive in query string or URL fragment (hash)
    const queryParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    if (queryParams.get('error') === 'login_required' || hashParams.get('error') === 'login_required') {
      console.log('[Callback] No SSO session (prompt=none returned login_required)');
      sessionStorage.setItem('sso_no_session', 'true');
      sessionStorage.removeItem('sso_auto_redirect_ts');
      // Clean up hash fragment from URL
      if (window.location.hash) {
        window.history.replaceState({}, '', window.location.pathname + window.location.search);
      }
      this.router.navigate(['/login']);
      return;
    }

    try {
      await this.auth.handleCallback();
      sessionStorage.removeItem('sso_auto_redirect_ts');
      sessionStorage.removeItem('sso_user_logged_out');
      sessionStorage.removeItem('sso_no_session');
      setTimeout(() => this.router.navigate(['/dashboard']), 800);
    } catch (err: any) {
      console.error('Callback error:', err);
      this.error = err.message || 'Authentication failed';
      this.cdr.detectChanges();
    }
  }

  retry(): void {
    this.router.navigate(['/login']);
  }
}
