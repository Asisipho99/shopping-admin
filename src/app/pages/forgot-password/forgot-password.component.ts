import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { AppError } from '../../core/models/app-error';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="login-wrapper" style="justify-content:center;">
      <div style="width:100%;max-width:420px;padding:40px 24px;">
        <h2 class="mb-1 fw-bold">Forgot Password</h2>
        <p class="text-muted mb-4">Enter your admin email to receive a reset link.</p>

        @if (success()) {
          <div class="alert alert-success" role="status">{{ success() }}</div>
        }
        @if (error()) {
          <div class="alert alert-danger" role="alert">{{ error() }}</div>
        }

        @if (!success()) {
          <div class="mb-3">
            <label class="form-label" for="admin-email">Email address</label>
            <input id="admin-email" type="email" class="form-control"
                   [(ngModel)]="email" placeholder="admin@example.com"
                   (keyup.enter)="submit()">
          </div>

          <button class="btn btn-primary w-100 mb-3"
                  (click)="submit()" [disabled]="loading()"
                  [attr.aria-busy]="loading()">
            @if (loading()) {
              <span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
              Sending...
            } @else {
              Send Reset Link
            }
          </button>
        }

        <p class="text-center mb-0" style="font-size:.875rem;">
          <a routerLink="/login" style="color:#6366f1;text-decoration:none;">
            Back to login
          </a>
        </p>
      </div>
    </div>
  `,
})
export class ForgotPasswordComponent {
  private readonly auth = inject(AuthService);

  email = '';

  readonly loading = signal(false);
  readonly success = signal('');
  readonly error = signal('');

  submit(): void {
    if (!this.email) {
      this.error.set('Please enter your email.');
      return;
    }

    this.loading.set(true);
    this.error.set('');

    this.auth.forgotPassword(this.email).subscribe({
      next: () => {
        // Deliberately the same response whether or not the address exists, so
        // this cannot be used to discover which admin accounts are registered.
        this.success.set('If that email is registered, a reset link has been sent.');
        this.loading.set(false);
      },
      error: (err: AppError) => {
        this.error.set(err.message);
        this.loading.set(false);
      },
    });
  }
}
