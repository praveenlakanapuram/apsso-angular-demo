import { Component, OnInit } from '@angular/core';
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

  constructor(private router: Router, private auth: AuthService) {}

  async ngOnInit() {
    try {
      await this.auth.handleCallback();
      setTimeout(() => this.router.navigate(['/dashboard']), 800);
    } catch (err: any) {
      this.error = err.message || 'Authentication failed';
    }
  }

  retry(): void {
    this.router.navigate(['/login']);
  }
}
