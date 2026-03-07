import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css' // We will put Auth.css here
})
export class LoginComponent {
  username = '';
  password = '';
  showPassword = false;
  error = '';
  loading = false;
  showReactivateAction = false;
  reactivating = false;

  authService = inject(AuthService);
  router = inject(Router);

  async handleLogin(event: Event) {
    event.preventDefault();
    this.error = '';
    this.showReactivateAction = false;
    this.loading = true;

    const result = await this.authService.login(this.username, this.password);
    if (result.success) {
      this.router.navigate(['/home']);
    } else {
      this.error = result.error || 'Login failed';
      this.showReactivateAction = this.error.toLowerCase().includes('deactivated');
    }
    this.loading = false;
  }

  async handleReactivateAccount() {
    const username = this.username.trim();
    const password = this.password;
    if (!username || !password) {
      this.error = 'Enter username/email and password to reactivate your account.';
      return;
    }

    this.reactivating = true;
    const result = await this.authService.reactivateAccount(username, password);
    if (!result.success) {
      this.error = result.error || 'Failed to reactivate account.';
      this.reactivating = false;
      return;
    }

    const loginResult = await this.authService.login(username, password);
    if (loginResult.success) {
      this.router.navigate(['/home']);
      return;
    }

    this.error = loginResult.error || 'Account reactivated, but login failed. Please try again.';
    this.reactivating = false;
  }
}
