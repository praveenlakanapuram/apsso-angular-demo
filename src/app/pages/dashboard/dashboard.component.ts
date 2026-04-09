import { Component } from '@angular/core';
import { AuthService, SSOUser } from '../../services/auth.service';
import { AsyncPipe, JsonPipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatDividerModule } from '@angular/material/divider';
import { MatListModule } from '@angular/material/list';
import { MatChipsModule } from '@angular/material/chips';
import { MatTableModule } from '@angular/material/table';

@Component({
  standalone: true,
  imports: [AsyncPipe, JsonPipe, MatCardModule, MatButtonModule, MatIconModule, MatToolbarModule, MatDividerModule, MatListModule, MatChipsModule, MatTableModule],
  template: `
    <mat-toolbar color="primary">
      <span>AP SSO Demo</span>
      <span class="spacer"></span>
      <button mat-icon-button (click)="logout()">
        <mat-icon>logout</mat-icon>
      </button>
    </mat-toolbar>

    @if (auth.user$ | async; as user) {
      <div class="content">
        <!-- Profile -->
        <mat-card appearance="outlined">
          <mat-card-header>
            <div mat-card-avatar class="avatar">{{ getInitials(user) }}</div>
            <mat-card-title>{{ user.name }}</mat-card-title>
            <mat-card-subtitle>{{ user.cfmsId || user.preferred_username }}</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <mat-list>
              <mat-list-item>
                <span matListItemTitle>Email</span>
                <span matListItemLine>{{ user.email || 'N/A' }}</span>
              </mat-list-item>
              <mat-list-item>
                <span matListItemTitle>Status</span>
                <span matListItemLine>{{ user.isActive ? 'Active' : 'Inactive' }}</span>
              </mat-list-item>
            </mat-list>
          </mat-card-content>
        </mat-card>

        <!-- Groups -->
        @if (user.groups && user.groups.length > 0) {
          <mat-card appearance="outlined">
            <mat-card-header>
              <mat-card-title>Groups</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <mat-chip-set class="groups-chips">
                @for (group of user.groups; track group) {
                  <mat-chip>{{ group }}</mat-chip>
                }
              </mat-chip-set>
            </mat-card-content>
          </mat-card>
        }

        <!-- Posts -->
        @if (user.posts && user.posts.length > 0) {
          <mat-card appearance="outlined">
            <mat-card-header>
              <mat-card-title>Posts ({{ user.posts.length }})</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              @for (post of user.posts; track post.postId) {
                <div class="post-item">
                  <div class="post-title">{{ post.postName || post.postId }}</div>
                  <div class="post-details">
                    <span>Dept: {{ post.deptName || post.deptId || 'N/A' }}</span>
                    @if (post.orgUnitName) {
                      <span>Org: {{ post.orgUnitName }}</span>
                    }
                    @if (post.apcfssDistrictName) {
                      <span>District: {{ post.apcfssDistrictName }}</span>
                    }
                    @if (post.apcfssMandalName) {
                      <span>Mandal: {{ post.apcfssMandalName }}</span>
                    }
                  </div>
                </div>
              }
            </mat-card-content>
          </mat-card>
        }

        <!-- Actions -->
        <mat-card appearance="outlined">
          <mat-card-header>
            <mat-card-title>SDK Actions</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="actions-row">
              <button mat-stroked-button (click)="refreshToken()">
                <mat-icon>refresh</mat-icon> Refresh Token
              </button>
              <button mat-stroked-button (click)="getToken()">
                <mat-icon>key</mat-icon> Get Token
              </button>
              <button mat-stroked-button (click)="checkAuth()">
                <mat-icon>check_circle</mat-icon> Check Auth
              </button>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Raw JSON -->
        <mat-card appearance="outlined">
          <mat-card-header>
            <mat-card-title>User Info (JSON)</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <pre class="json-block">{{ user | json }}</pre>
          </mat-card-content>
        </mat-card>
      </div>
    }
  `,
  styles: [`
    .spacer { flex: 1 1 auto; }
    .content {
      max-width: 700px;
      margin: 24px auto;
      padding: 0 16px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .avatar {
      background: #1976d2;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: 16px;
      border-radius: 50%;
    }
    .groups-chips {
      padding-top: 8px;
    }
    .post-item {
      padding: 12px 0;
      border-bottom: 1px solid #eee;
    }
    .post-item:last-child { border-bottom: none; }
    .post-title {
      font-weight: 500;
      font-size: 14px;
      margin-bottom: 4px;
    }
    .post-details {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      font-size: 12px;
      color: #666;
    }
    .actions-row {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      padding-top: 8px;
    }
    .json-block {
      background: #fafafa;
      border: 1px solid #eee;
      border-radius: 4px;
      padding: 16px;
      font-size: 12px;
      overflow-x: auto;
      margin: 8px 0 0;
    }
  `],
})
export class DashboardComponent {
  constructor(public auth: AuthService) {}

  getInitials(user: SSOUser): string {
    return (user.name || '').split(' ').map(p => p[0]).join('').toUpperCase().substring(0, 2);
  }

  async refreshToken(): Promise<void> {
    try { await this.auth.refreshToken(); }
    catch (err: any) { alert('Refresh failed: ' + err.message); }
  }

  async getToken(): Promise<void> {
    const token = await this.auth.getAccessToken();
    alert(token ? `Token: ${token.substring(0, 50)}...` : 'No token available');
  }

  checkAuth(): void {
    alert(`Authenticated: ${this.auth.isAuthenticated()}`);
  }

  logout(): void {
    this.auth.logout();
  }
}
