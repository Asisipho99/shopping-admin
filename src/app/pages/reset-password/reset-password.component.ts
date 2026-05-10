import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="login-wrapper" style="justify-content:center;">
      <div style="width:100%;max-width:420px;padding:40px 24px;">
        <h2 class="mb-1 fw-bold">Reset Password</h2>
        <p class="text-muted mb-4">Enter your new admin password.</p>

        <div class="alert alert-success" *ngIf="success">
          {{ success }} <a routerLink="/login">Sign in</a>
        </div>
        <div class="alert alert-danger" *ngIf="error">{{ error }}</div>

        <ng-container *ngIf="!success">
          <div class="mb-3">
            <label class="form-label">New Password</label>
            <input type="password" class="form-control"
                   [(ngModel)]="newPassword"
                   placeholder="Min 8 chars, uppercase, lowercase, number">
          </div>
          <div class="mb-4">
            <label class="form-label">Confirm Password</label>
            <input type="password" class="form-control"
                   [(ngModel)]="confirmPassword"
                   placeholder="Repeat new password"
                   (keyup.enter)="submit()">
          </div>
          <button class="btn btn-primary w-100"
                  (click)="submit()" [disabled]="loading">
            <span *ngIf="loading" class="spinner-border spinner-border-sm me-2"></span>
            {{ loading ? 'Resetting...' : 'Reset Password' }}
          </button>
        </ng-container>
      </div>
    </div>
  `
})
export class ResetPasswordComponent implements OnInit {
  token           = '';
  newPassword     = '';
  confirmPassword = '';
  loading         = false;
  success         = '';
  error           = '';

  constructor(private auth: AuthService, private route: ActivatedRoute) {}

  ngOnInit() {
    this.token = this.route.snapshot.queryParamMap.get('token') || '';
    if (!this.token) this.error = 'Invalid reset link. Please request a new one.';
  }

  submit() {
    this.error = '';
    if (this.newPassword.length < 8) { this.error = 'Password must be at least 8 characters.'; return; }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(this.newPassword)) {
      this.error = 'Password must contain uppercase, lowercase, and a number.'; return;
    }
    if (this.newPassword !== this.confirmPassword) { this.error = 'Passwords do not match.'; return; }

    this.loading = true;
    this.auth.resetPassword(this.token, this.newPassword).subscribe({
      next: () => { this.success = 'Password reset successfully!'; this.loading = false; },
      error: (err) => {
        this.error   = err.error?.message || 'Invalid or expired token.';
        this.loading = false;
      }
    });
  }
}
