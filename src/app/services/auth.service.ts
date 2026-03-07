import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private userSubject = new BehaviorSubject<any>(null);
  public user$ = this.userSubject.asObservable();

  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  private api = inject(ApiService);

  constructor() {
    this.checkInitialAuth();
  }

  get currentUser() {
    return this.userSubject.value;
  }

  get isAuthenticated() {
    return this.isAuthenticatedSubject.value;
  }

  private checkInitialAuth() {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (token && storedUser) {
      this.userSubject.next(JSON.parse(storedUser));
      this.isAuthenticatedSubject.next(true);
    }
  }

  async login(username: string, password: string): Promise<{ success: boolean; error?: string }> {
    try {
      const normalizedUsername = (username || '').trim();
      if (!normalizedUsername || !password) {
        return { success: false, error: 'Username/email and password are required.' };
      }

      // Prevent stale/expired token from interfering with a fresh login attempt.
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      this.userSubject.next(null);
      this.isAuthenticatedSubject.next(false);

      const response = await firstValueFrom(this.api.post<any>('/auth/login', { username: normalizedUsername, password }));

      const { token, user: userData } = response;

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));

      this.userSubject.next(userData);
      this.isAuthenticatedSubject.next(true);
      return { success: true };
    } catch (error: any) {
      console.error("Login Error:", error);

      let actualError = 'Login failed. Please check your credentials.';
      if (error.status === 0) {
        actualError = 'Cannot connect to server. Is the backend running on port 9999?';
      } else if (error.error?.message) {
        actualError = error.error.message;
      } else if (typeof error.error === 'string') {
        actualError = error.error;
      }

      return {
        success: false,
        error: actualError
      };
    }
  }

  async reactivateAccount(username: string, password: string): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const message = await firstValueFrom(
        this.api.post<any>('/auth/reactivate', { username, password }, { responseType: 'text' })
      );
      return { success: true, message };
    } catch (error: any) {
      let actualError = 'Failed to reactivate account.';
      if (error.status === 0) {
        actualError = 'Cannot connect to server. Is the backend running on port 9999?';
      } else if (typeof error.error === 'string') {
        actualError = error.error;
      } else if (error.error?.message) {
        actualError = error.error.message;
      }
      return { success: false, error: actualError };
    }
  }

  async register(userData: any): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const response = await firstValueFrom(this.api.post<any>('/auth/register', userData, { responseType: 'text' }));
      return { success: true, message: response };
    } catch (error: any) {
      console.error("Registration Error:", error);

      let actualError = 'Registration failed.';
      if (error.status === 0) {
        actualError = 'Cannot connect to server. Is the backend running on port 9999?';
      } else if (error.error) {
        actualError = typeof error.error === 'string'
          ? error.error : (error.error?.message || JSON.stringify(error.error));
      } else {
        actualError = error.message;
      }

      return {
        success: false,
        error: actualError
      };
    }
  }

  async requestRegistrationOtp(userData: any): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const message = await firstValueFrom(
        this.api.post<any>('/auth/register/request', userData, { responseType: 'text' })
      );
      return { success: true, message };
    } catch (error: any) {
      let actualError = 'Unable to send registration OTP.';
      if (error.status === 0) {
        actualError = 'Cannot connect to server. Is the backend running on port 9999?';
      } else if (typeof error.error === 'string') {
        actualError = error.error;
      } else if (error.error?.message) {
        actualError = error.error.message;
      }
      return { success: false, error: actualError };
    }
  }

  async verifyRegistrationOtp(email: string, otp: string): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const message = await firstValueFrom(
        this.api.post<any>('/auth/register/verify', { email, otp }, { responseType: 'text' })
      );
      return { success: true, message };
    } catch (error: any) {
      let actualError = 'Registration OTP verification failed.';
      if (error.status === 0) {
        actualError = 'Cannot connect to server. Is the backend running on port 9999?';
      } else if (typeof error.error === 'string') {
        actualError = error.error;
      } else if (error.error?.message) {
        actualError = error.error.message;
      }
      return { success: false, error: actualError };
    }
  }

  async requestPasswordResetOtp(email: string): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const message = await firstValueFrom(
        this.api.post<any>('/auth/forgot-password/request', { email }, { responseType: 'text' })
      );
      return { success: true, message };
    } catch (error: any) {
      let actualError = 'Unable to send OTP. Please try again.';
      if (error.status === 0) {
        actualError = 'Cannot connect to server. Is the backend running on port 9999?';
      } else if (typeof error.error === 'string') {
        actualError = error.error;
      } else if (error.error?.message) {
        actualError = error.error.message;
      }

      return { success: false, error: actualError };
    }
  }

  async verifyPasswordResetOtp(email: string, otp: string): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const message = await firstValueFrom(
        this.api.post<any>('/auth/forgot-password/verify', { email, otp }, { responseType: 'text' })
      );
      return { success: true, message };
    } catch (error: any) {
      let actualError = 'OTP verification failed.';
      if (error.status === 0) {
        actualError = 'Cannot connect to server. Is the backend running on port 9999?';
      } else if (typeof error.error === 'string') {
        actualError = error.error;
      } else if (error.error?.message) {
        actualError = error.error.message;
      }

      return { success: false, error: actualError };
    }
  }

  async resetPasswordWithOtp(
    email: string,
    otp: string,
    newPassword: string,
    confirmPassword: string
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const message = await firstValueFrom(
        this.api.post<any>(
          '/auth/forgot-password/reset',
          { email, otp, newPassword, confirmPassword },
          { responseType: 'text' }
        )
      );
      return { success: true, message };
    } catch (error: any) {
      let actualError = 'Password reset failed.';
      if (error.status === 0) {
        actualError = 'Cannot connect to server. Is the backend running on port 9999?';
      } else if (typeof error.error === 'string') {
        actualError = error.error;
      } else if (error.error?.message) {
        actualError = error.error.message;
      }

      return { success: false, error: actualError };
    }
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.userSubject.next(null);
    this.isAuthenticatedSubject.next(false);
  }

  updateUser(newUserData: any) {
    this.userSubject.next(newUserData);
    localStorage.setItem('user', JSON.stringify(newUserData));
  }
}
