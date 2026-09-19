import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { AppError } from '../../core/models/app-error';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  email = '';
  password = '';
  showPassword = false;

  // Signals: set from the login response, so plain fields would never repaint
  // under zoneless change detection.
  readonly error = signal('');
  readonly loading = signal(false);

  /** Where to go after signing in, set by the interceptor on session expiry. */
  private returnUrl = '/dashboard';

  ngOnInit(): void {
    this.returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/dashboard';
  }

  login(): void {
    this.loading.set(true);
    this.error.set('');

    this.auth.login(this.email, this.password).subscribe({
      next: () => {
        // The console is admin-only, so a non-admin account must not get in
        // even though the credentials were valid.
        if (!this.auth.isAdmin()) {
          this.auth.clearSession();
          this.error.set('That account does not have administrator access.');
          this.loading.set(false);
          return;
        }
        this.router.navigateByUrl(this.returnUrl);
      },
      error: (err: AppError) => {
        // A 401 here means the credentials were wrong, not that a session
        // lapsed, so keep the specific wording rather than the mapped default.
        this.error.set(
          err.kind === 'auth'
            ? 'Invalid email or password. Please try again.'
            : err.message
        );
        this.loading.set(false);
      },
    });
  }
}
