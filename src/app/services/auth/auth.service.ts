import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';

import { environment } from '../../../environments/environment';

export interface GoogleUserInfo {
  name?: string;
  email?: string;
  picture?: string;
  sub?: string;
}

interface AuthSessionResponse {
  authenticated?: boolean;
  user?: GoogleUserInfo;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  constructor(private http: HttpClient) {}

  startGoogleLogin(): void {
    const returnTo = `${window.location.origin}${window.location.pathname}`;
    const params = new URLSearchParams({ return_to: returnTo });

    window.location.href = `${environment.API}/auth/google/start?${params.toString()}`;
  }

  syncSessionFromBackend(): Observable<GoogleUserInfo | null> {
    return this.http
      .get<AuthSessionResponse>(`${environment.API}/auth/session`, { withCredentials: true })
      .pipe(
        map((response) => {
          if (!response || !response.authenticated || !response.user) {
            return null;
          }

          return response.user;
        }),
        tap((user) => {
          if (user) {
            localStorage.setItem('googleUser', JSON.stringify(user));
          } else {
            localStorage.removeItem('googleUser');
          }
        }),
        catchError(() => {
          localStorage.removeItem('googleUser');

          return of(null);
        })
      );
  }

  logout(): Observable<void> {
    return this.http.post<void>(`${environment.API}/auth/logout`, {}, { withCredentials: true }).pipe(
      tap(() => localStorage.removeItem('googleUser')),
      catchError(() => {
        localStorage.removeItem('googleUser');

        return of(void 0);
      })
    );
  }

  restoreSession(): GoogleUserInfo | null {
    const cachedUser = localStorage.getItem('googleUser');

    if (!cachedUser) {
      return null;
    }

    try {
      return JSON.parse(cachedUser);
    } catch (error) {
      localStorage.removeItem('googleUser');

      return null;
    }
  }
}
