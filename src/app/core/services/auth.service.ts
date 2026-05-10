import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {

  private url = `${environment.userServiceUrl}/users`;

  constructor(private http: HttpClient, private router: Router) {}

  login(email: string, password: string): Observable<any> {
    return this.http.post(`${this.url}/login`, { email, password })
      .pipe(tap((res: any) => {
        localStorage.setItem('token',      res.token);
        localStorage.setItem('customerId', res.customerId);
        localStorage.setItem('email',      res.email);
        localStorage.setItem('role',       res.role);
      }));
  }

  forgotPassword(email: string): Observable<any> {
    return this.http.post(`${this.url}/forgot-password`, { email },
      { responseType: 'text' });
  }

  resetPassword(token: string, newPassword: string): Observable<any> {
    return this.http.post(`${this.url}/reset-password`, { token, newPassword },
      { responseType: 'text' });
  }

  logout(): void {
    localStorage.clear();
    this.router.navigate(['/login']);
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem('token');
  }

  isAdmin(): boolean {
    return localStorage.getItem('role') === 'ADMIN';
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }
}