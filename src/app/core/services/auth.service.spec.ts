import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { AuthService } from './auth.service';

/** Builds an unsigned JWT with the given exp claim (seconds since epoch). */
function tokenWithExp(expSeconds: number | null): string {
  const payload = expSeconds === null ? { sub: 'a@b.c' } : { sub: 'a@b.c', exp: expSeconds };
  const b64 = (o: unknown) =>
    btoa(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${b64({ alg: 'HS256' })}.${b64(payload)}.signature`;
}

describe('AuthService', () => {
  let auth: AuthService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient()],
    });
    auth = TestBed.inject(AuthService);
  });

  afterEach(() => localStorage.clear());

  describe('isLoggedIn', () => {
    it('is false with no token', () => {
      expect(auth.isLoggedIn()).toBe(false);
    });

    it('is true for a token that has not expired', () => {
      const future = Math.floor(Date.now() / 1000) + 3600;
      localStorage.setItem('token', tokenWithExp(future));
      expect(auth.isLoggedIn()).toBe(true);
    });

    /**
     * The behaviour that used to be missing. Presence alone let the route guard
     * admit an admin whose 24-hour token had lapsed; every request then 401'd
     * with nothing to explain the empty screen.
     */
    it('is false for an expired token', () => {
      const past = Math.floor(Date.now() / 1000) - 60;
      localStorage.setItem('token', tokenWithExp(past));
      expect(auth.isLoggedIn()).toBe(false);
    });

    it('defers to the server when the token carries no exp claim', () => {
      localStorage.setItem('token', tokenWithExp(null));
      expect(auth.isLoggedIn()).toBe(true);
    });

    it('defers to the server when the token is not a readable JWT', () => {
      localStorage.setItem('token', 'opaque-session-token');
      expect(auth.isLoggedIn()).toBe(true);
    });
  });

  describe('getTokenExpiry', () => {
    it('returns the exp claim in milliseconds', () => {
      const exp = Math.floor(Date.now() / 1000) + 120;
      expect(auth.getTokenExpiry(tokenWithExp(exp))).toBe(exp * 1000);
    });

    it('returns null for a malformed token', () => {
      expect(auth.getTokenExpiry('not.a.jwt')).toBeNull();
      expect(auth.getTokenExpiry('onlyonepart')).toBeNull();
      expect(auth.getTokenExpiry(null)).toBeNull();
    });
  });

  describe('clearSession', () => {
    it('removes the session keys without navigating', () => {
      localStorage.setItem('token', 'x');
      localStorage.setItem('role', 'ADMIN');
      localStorage.setItem('customerId', '1');
      localStorage.setItem('email', 'a@b.c');

      auth.clearSession();

      expect(localStorage.getItem('token')).toBeNull();
      expect(localStorage.getItem('role')).toBeNull();
      expect(localStorage.getItem('customerId')).toBeNull();
      expect(localStorage.getItem('email')).toBeNull();
    });
  });

  describe('isAdmin', () => {
    it('is true only for the ADMIN role', () => {
      localStorage.setItem('role', 'ADMIN');
      expect(auth.isAdmin()).toBe(true);

      localStorage.setItem('role', 'CUSTOMER');
      expect(auth.isAdmin()).toBe(false);
    });
  });
});
