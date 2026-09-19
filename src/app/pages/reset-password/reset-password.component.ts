import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { AppError } from '../../core/models/app-error';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="login-wrapper" style="justify-content:center;">
      <div style="width:100%;max-width:420px;padding:40px 24px;">
        <h2 class="mb-1 fw-bold">Reset Password</h2>
        <p class="text-muted mb-4">Enter your new admin password.</p>

        @if (success()) {
          <div class="alert alert-success" role="status">
            {{ success() }} <a routerLink="/login">Sign in</a>
          </div>
        }
        @if (error()) {
          <div class="alert alert-danger" role="alert">{{ error() }}</div>
        }

        @if (!success()) {
          <div class="mb-3">
            <label class="form-label" for="new-password">New Password</label>
            <input id="new-password" type="password" class="form-control"
                   [(ngModel)]="newPassword"
                   placeholder="Min 8 chars, uppercase, lowercase, number">
          </div>
          <div class="mb-4">
            <label class="form-label" for="confirm-password">Confirm Password</label>
            <input id="confirm-password" type="password" class="form-control"
                   [(ngModel)]="confirmPassword"
                   placeholder="Repeat new password"
                   (keyup.enter)="submit()">
          </div>
          <button class="btn btn-primary w-100"
                  (click)="submit()" [disabled]="loading()"
                  [attr.aria-busy]="loading()">
            @if (loading()) {
              <span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
              Resetting...
            } @else {
              Reset Password
            }
          </button>
        }
      </div>
    </div>
  `,
})
export class ResetPasswordComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);

  token = '';
  newPassword = '';
  confirmPassword = '';

  readonly loading = signal(false);
  readonly success = signal('');
  readonly error = signal('');

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') || '';
    if (!this.token) {
      this.error.set('Invalid reset link. Please request a new one.');
    }
  }

  submit(): void {
    this.error.set('');

    if (this.newPassword.length < 8) {
      this.error.set('Password must be at least 8 characters.');
      return;
    }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(this.newPassword)) {
      this.error.set('Password must contain uppercase, lowercase, and a number.');
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.error.set('Passwords do not match.');
      return;
    }

    this.loading.set(true);
    this.auth.resetPassword(this.token, this.newPassword).subscribe({
      next: () => {
        this.success.set('Password reset successfully!');
        this.loading.set(false);
      },
      error: (err: AppError) => {
        // A rejected or expired token comes back as a 400 with server text;
        // fall back to explicit wording when the server said nothing useful.
        this.error.set(
          err.kind === 'validation' || err.kind === 'conflict'
            ? err.message
            : 'Invalid or expired token.'
        );
        this.loading.set(false);
      },
    });
  }
}
