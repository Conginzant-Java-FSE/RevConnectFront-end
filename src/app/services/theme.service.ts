import { Injectable, inject } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { AuthService } from './auth.service';

export type ThemeMode = 'dark' | 'light';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly storagePrefix = 'revconnect_theme_';
  private readonly themeSubject = new BehaviorSubject<ThemeMode>('dark');
  readonly theme$ = this.themeSubject.asObservable();

  private authService = inject(AuthService);

  constructor() {
    this.authService.user$.subscribe(user => {
      const userId = user?.id;
      const theme = this.readStoredTheme(userId) || 'dark';
      this.applyTheme(theme);
    });
  }

  get currentTheme(): ThemeMode {
    return this.themeSubject.value;
  }

  setTheme(theme: ThemeMode) {
    this.applyTheme(theme);

    const userId = this.authService.currentUser?.id;
    if (!userId) {
      return;
    }

    localStorage.setItem(this.getStorageKey(userId), theme);
  }

  private applyTheme(theme: ThemeMode) {
    this.themeSubject.next(theme);

    const isLight = theme === 'light';
    document.documentElement.classList.toggle('theme-light', isLight);
    document.documentElement.classList.toggle('theme-dark', !isLight);
  }

  private readStoredTheme(userId: number | undefined): ThemeMode | null {
    if (!userId) {
      return null;
    }

    const stored = localStorage.getItem(this.getStorageKey(userId));
    if (stored === 'light' || stored === 'dark') {
      return stored;
    }

    return null;
  }

  private getStorageKey(userId: number) {
    return `${this.storagePrefix}${userId}`;
  }
}
