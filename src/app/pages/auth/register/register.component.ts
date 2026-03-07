import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent {
  formData = {
    name: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'USER'
  };
  error = '';
  message = '';
  loading = false;
  step: 'FORM' | 'OTP' = 'FORM';
  registrationOtp = '';
  showPassword = false;
  showConfirmPassword = false;

  authService = inject(AuthService);
  router = inject(Router);

  async handleRegister(event: Event) {
    event.preventDefault();
    this.error = '';
    this.message = '';
    this.loading = true;

    if ((this.formData.password || '').length < 8) {
      this.error = 'Password must be at least 8 characters long.';
      this.loading = false;
      return;
    }

    if (this.formData.password !== this.formData.confirmPassword) {
      this.error = 'Passwords do not match.';
      this.loading = false;
      return;
    }

    const payload = {
      ...this.formData
    };

    const result = await this.authService.requestRegistrationOtp(payload);
    if (result.success) {
      this.step = 'OTP';
      this.message = result.message || 'OTP sent to your email.';
    } else {
      this.error = result.error || "Registration failed. Check if username/email exists or passwords match.";
    }
    this.loading = false;
  }

  async handleVerifyOtp(event: Event) {
    event.preventDefault();
    this.error = '';
    this.message = '';
    const otp = this.registrationOtp.trim();
    if (!otp) {
      this.error = 'OTP is required.';
      return;
    }

    this.loading = true;
    const result = await this.authService.verifyRegistrationOtp(this.formData.email.trim().toLowerCase(), otp);
    this.loading = false;
    if (result.success) {
      this.router.navigate(['/login']);
      return;
    }
    this.error = result.error || 'OTP verification failed.';
  }

  async resendRegistrationOtp() {
    this.error = '';
    this.message = '';
    this.loading = true;
    const payload = { ...this.formData };
    const result = await this.authService.requestRegistrationOtp(payload);
    this.loading = false;
    if (result.success) {
      this.message = result.message || 'OTP resent.';
    } else {
      this.error = result.error || 'Could not resend OTP.';
    }
  }
}
