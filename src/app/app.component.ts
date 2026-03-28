import { Component, OnInit } from '@angular/core';
import { name, version } from '../../package.json';

import { SearchService } from './services/search/search.service';
import { environment } from '../environments/environment';

interface GoogleUserInfo {
  name?: string;
  email?: string;
  picture?: string;
  sub?: string;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.sass']
})
export class AppComponent implements OnInit {
  public searchText = '';
  public googleUser: GoogleUserInfo | null = null;

  private readonly googleClientId = environment.GOOGLE_CLIENT_ID;
  private readonly redirectUri = window.location.origin;

  constructor(private searchService: SearchService) {}

  ngOnInit(): void {
    console.info(`🌱 ${name} version ${version}`);
    this.restoreSession();
    this.processGoogleAuthResponse();
  }

  onChange(value: string): void {
    this.searchText = value;
    this.searchService.search(value);
  }

  hasSession(): boolean {
    return this.googleUser !== null;
  }

  startGoogleLogin(): void {
    if (!this.googleClientId) {
      console.error('GOOGLE_CLIENT_ID is not configured in the environment files.');
      return;
    }

    const params = new URLSearchParams({
      client_id: this.googleClientId,
      redirect_uri: this.redirectUri,
      response_type: 'id_token token',
      scope: 'openid profile email',
      nonce: this.generateNonce(),
      prompt: 'select_account'
    });

    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  logout(): void {
    localStorage.removeItem('googleUser');
    this.googleUser = null;
  }

  private restoreSession(): void {
    const cachedUser = localStorage.getItem('googleUser');

    if (cachedUser) {
      this.googleUser = JSON.parse(cachedUser);
    }
  }

  private processGoogleAuthResponse(): void {
    if (!window.location.hash) {
      return;
    }

    const hash = window.location.hash.substring(1);
    const hashParams = new URLSearchParams(hash);
    const idToken = hashParams.get('id_token');

    if (!idToken) {
      return;
    }

    const parsedUser = this.parseJwtPayload(idToken);

    if (parsedUser) {
      this.googleUser = parsedUser;
      localStorage.setItem('googleUser', JSON.stringify(parsedUser));
    }

    history.replaceState(null, '', window.location.pathname + window.location.search);
  }

  private parseJwtPayload(token: string): GoogleUserInfo | null {
    const payload = token.split('.')[1];

    if (!payload) {
      return null;
    }

    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((char) => `%${(`00${char.charCodeAt(0).toString(16)}`).slice(-2)}`)
        .join('')
    );

    return JSON.parse(jsonPayload);
  }

  private generateNonce(): string {
    return Math.random().toString(36).slice(2);
  }
}
