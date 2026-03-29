import { Component, OnInit } from '@angular/core';
import { NzMessageService } from 'ng-zorro-antd/message';
import { name, version } from '../../package.json';

import { SearchService } from './services/search/search.service';
import { AuthService, GoogleUserInfo } from './services/auth/auth.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.sass']
})
export class AppComponent implements OnInit {
  public searchText = '';
  public googleUser: GoogleUserInfo | null = null;
  public isAuthLoading = false;

  constructor(
    private searchService: SearchService,
    private authService: AuthService,
    private messageService: NzMessageService
  ) {}

  ngOnInit(): void {
    console.info(`🌱 ${name} version ${version}`);

    this.googleUser = this.authService.restoreSession();
    this.refreshSession();
  }

  onChange(value: string): void {
    this.searchText = value;
    this.searchService.search(value);
  }

  hasSession(): boolean {
    return this.googleUser !== null;
  }

  startGoogleLogin(): void {
    this.authService.startGoogleLogin();
  }

  logout(): void {
    this.isAuthLoading = true;

    this.authService.logout().subscribe(() => {
      this.googleUser = null;
      this.isAuthLoading = false;
      this.messageService.info('Sesión cerrada');
    });
  }

  private refreshSession(): void {
    this.isAuthLoading = true;

    this.authService.syncSessionFromBackend().subscribe((user) => {
      this.googleUser = user;
      this.isAuthLoading = false;
    });
  }
}
