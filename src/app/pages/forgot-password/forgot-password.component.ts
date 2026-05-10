import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="login-wrapper" style="justify-content:center;">
      <div style="width:100%;max-width:420px;padding:40px 24px;">
        <h2 class="mb-1 fw-bold">Forgot Password</h2>
        <p class="text-muted mb-4">Enter your admin email to receive a reset link.</p>

        <div class="alert alert-success" *ngIf="success">{{ success }}</div>
        <div class="alert alert-danger"  *ngIf="error">{{ error }}</div>

        <div class="mb-3" *ngIf="!success">
          <label class="form-label">Email address</label>
          <input type="email" class="form-control"
                 [(ngModel)]="email" placeholder="admin@example.com"
                 (keyup.enter)="submit()">
        </div>

        <button class="btn btn-primary w-100 mb-3" *ngIf="!success"
                (click)="submit()" [disabled]="loading">
          <span *ngIf="loading" class="spinner-border spinner-border-sm me-2"></span>
          {{ loading ? 'Sending...' : 'Send Reset Link' }}
        </button>

        <p class="text-center mb-0" style="font-size:.875rem;">
          <a routerLink="/login" style="color:#6366f1;text-decoration:none;">
            Back to login
          </a>
        </p>
      </div>
    </div>
  `
})
export class ForgotPasswordComponent {
  email   = '';
  loading = false;
  success = '';
  error   = '';

  constructor(private auth: AuthService) {}

  submit() {
    if (!this.email) { this.error = 'Please enter your email.'; return; }
    this.loading = true;
    this.error   = '';
    this.auth.forgotPassword(this.email).subscribe({
      next: () => {
        this.success = 'If that email is registered, a reset link has been sent.';
        this.loading = false;
      },
      error: () => { this.error = 'Something went wrong.'; this.loading = false; }
    });
  }
}
