import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.css'
})
export class ForgotPasswordComponent {
  step = 1;
  email = '';
  otp = '';
  newPassword = '';
  confirmPassword = '';
  showNewPassword = false;
  showConfirmPassword = false;
  loading = false;
  error = '';
  message = '';

  private authService = inject(AuthService);
  private router = inject(Router);

  private clearAlerts() {
    this.error = '';
    this.message = '';
  }

  async requestOtp(event?: Event) {
    event?.preventDefault();
    this.clearAlerts();

    const normalizedEmail = this.email.trim().toLowerCase();
    if (!normalizedEmail) {
      this.error = 'Email is required';
      return;
    }

    const confirmed = window.confirm(`Send OTP to ${normalizedEmail}?`);
    if (!confirmed) {
      return;
    }

    this.loading = true;
    const result = await this.authService.requestPasswordResetOtp(normalizedEmail);
    this.loading = false;

    if (!result.success) {
      this.error = result.error || 'Unable to send OTP.';
      return;
    }

    this.email = normalizedEmail;
    this.step = 2;
    this.message = result.message || 'If this email is registered, an OTP has been sent.';
  }

  async verifyOtp(event?: Event) {
    event?.preventDefault();
    this.clearAlerts();

    const otp = this.otp.trim();
    if (!otp) {
      this.error = 'OTP is required';
      return;
    }

    this.loading = true;
    const result = await this.authService.verifyPasswordResetOtp(this.email, otp);
    this.loading = false;

    if (!result.success) {
      this.error = result.error || 'Invalid OTP';
      return;
    }

    this.otp = otp;
    this.step = 3;
    this.message = result.message || 'OTP verified. Set your new password.';
  }

  async resetPassword(event?: Event) {
    event?.preventDefault();
    this.clearAlerts();

    if (this.newPassword.length < 8) {
      this.error = 'Password must be at least 8 characters long';
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      this.error = 'Passwords do not match';
      return;
    }

    this.loading = true;
    const result = await this.authService.resetPasswordWithOtp(
      this.email,
      this.otp,
      this.newPassword,
      this.confirmPassword
    );
    this.loading = false;

    if (!result.success) {
      this.error = result.error || 'Password reset failed.';
      return;
    }

    this.step = 4;
    this.message = result.message || 'Password reset successfully. Please login.';
    this.newPassword = '';
    this.confirmPassword = '';
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }
}
