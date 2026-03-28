import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from, throwError } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import { environment } from '../../../environments/environment';

export interface GoogleUserInfo {
  name?: string;
  email?: string;
  picture?: string;
  sub?: string;
}

interface AuthApiResponse {
  user?: GoogleUserInfo;
  profile?: GoogleUserInfo;
  token?: string;
}

interface RuntimeWindow extends Window {
  __env?: {
    GOOGLE_CLIENT_ID?: string;
  };
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private scriptPromise: Promise<void> | null = null;

  constructor(private http: HttpClient) {}

  getGoogleClientId(): string {
    const runtimeWindow = window as RuntimeWindow;

    return runtimeWindow.__env?.GOOGLE_CLIENT_ID || environment.GOOGLE_CLIENT_ID;
  }

  loginWithGoogle(): Observable<GoogleUserInfo> {
    const clientId = this.getGoogleClientId();

    if (!clientId) {
      return throwError(() => new Error('GOOGLE_CLIENT_ID no está configurado.'));
    }

    return from(this.loadGoogleScript()).pipe(
      switchMap(() => from(this.requestAuthorizationCode(clientId))),
      switchMap((code) => this.exchangeCodeForSession(code)),
      switchMap((response) => {
        const user = response.user || response.profile;

        if (!user) {
          return throwError(() => new Error('El backend no devolvió la información del usuario.'));
        }

        if (response.token) {
          localStorage.setItem('authToken', response.token);
        }

        localStorage.setItem('googleUser', JSON.stringify(user));

        return from(Promise.resolve(user));
      })
    );
  }

  logout(): void {
    localStorage.removeItem('googleUser');
    localStorage.removeItem('authToken');
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

  private exchangeCodeForSession(code: string): Observable<AuthApiResponse> {
    const redirectUri = window.location.origin;

    return this.http.post<AuthApiResponse>(`${environment.API}/auth/google`, {
      code,
      redirectUri
    });
  }

  private requestAuthorizationCode(clientId: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const codeClient = google.accounts.oauth2.initCodeClient({
        client_id: clientId,
        scope: 'openid profile email',
        ux_mode: 'popup',
        callback: (response) => {
          if (!response.code) {
            reject(new Error('Google no devolvió código de autorización.'));

            return;
          }

          resolve(response.code);
        },
        error_callback: (error) => reject(new Error(error.message || 'Error de Google OAuth.'))
      });

      codeClient.requestCode();
    });
  }

  private loadGoogleScript(): Promise<void> {
    if (this.scriptPromise) {
      return this.scriptPromise;
    }

    this.scriptPromise = new Promise((resolve, reject) => {
      if (window.google && window.google.accounts && window.google.accounts.oauth2) {
        resolve();

        return;
      }

      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('No se pudo cargar Google Identity Services.'));

      document.head.appendChild(script);
    });

    return this.scriptPromise;
  }
}
