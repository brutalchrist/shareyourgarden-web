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
  }

  onChange(value: string): void {
    this.searchText = value;
    this.searchService.search(value);
  }

  hasSession(): boolean {
    return this.googleUser !== null;
  }

  startGoogleLogin(): void {
    this.isAuthLoading = true;

    this.authService.loginWithGoogle().subscribe({
      next: (user) => {
        this.googleUser = user;
        this.messageService.success('Sesión iniciada correctamente');
        this.isAuthLoading = false;
      },
      error: (error: Error) => {
        this.messageService.error(error.message || 'No se pudo iniciar sesión con Google');
        this.isAuthLoading = false;
      }
    });
  }

  logout(): void {
    this.authService.logout();
    this.googleUser = null;
    this.messageService.info('Sesión cerrada');
  }
}
