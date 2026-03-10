import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom, Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.css'
})
export class SettingsComponent implements OnInit, OnDestroy {
  authService = inject(AuthService);
  router = inject(Router);
  api = inject(ApiService);
  themeService = inject(ThemeService);

  notifications = true;
  privateAccount = false;
  isLightTheme = false;
  accountUsername = '';
  accountEmail = '';
  savingAccount = false;

  user: any = null;
  private userSub!: Subscription;
  private themeSub!: Subscription;

  showDeleteModal = false;
  showDeactivateModal = false;
  deleting = false;
  deactivating = false;
  deletePassword = '';
  deactivatePassword = '';
  showDeletePassword = false;
  showDeactivatePassword = false;

  ngOnInit() {
    this.userSub = this.authService.user$.subscribe(user => {
      this.user = user;
      this.privateAccount = this.resolvePrivateAccount(user);
      this.accountUsername = user?.username || '';
      this.accountEmail = user?.email || '';
    });

    this.themeSub = this.themeService.theme$.subscribe(theme => {
      this.isLightTheme = theme === 'light';
    });
  }

  ngOnDestroy() {
    if (this.userSub) {
      this.userSub.unsubscribe();
    }
    if (this.themeSub) {
      this.themeSub.unsubscribe();
    }
  }

  handleThemeToggle(event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    this.themeService.setTheme(checked ? 'light' : 'dark');
  }

  handleLogout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  async handleDeleteAccount() {
    const password = this.deletePassword.trim();
    if (!password) {
      alert('Please enter your password to delete your account.');
      return;
    }

    this.deleting = true;
    try {
      await firstValueFrom(this.api.put('/settings/delete', { password }, { responseType: 'text' as 'json' }));
      alert('Account deleted successfully.');
      this.handleLogout();
    } catch (err: any) {
      console.error('Failed to delete account', err);
      alert(err?.error || 'Failed to delete account. Please verify password and try again.');
    } finally {
      this.deleting = false;
      this.showDeleteModal = false;
      this.deletePassword = '';
    }
  }

  async handleDeactivateAccount() {
    const password = this.deactivatePassword.trim();
    if (!password) {
      alert('Please enter your password to deactivate your account.');
      return;
    }

    this.deactivating = true;
    try {
      await firstValueFrom(this.api.put('/settings/deactivate', { password }, { responseType: 'text' as 'json' }));
      alert('Account deactivated successfully.');
      this.handleLogout();
    } catch (err: any) {
      console.error('Failed to deactivate account', err);
      alert(err?.error || 'Failed to deactivate account. Please verify password and try again.');
    } finally {
      this.deactivating = false;
      this.showDeactivateModal = false;
      this.deactivatePassword = '';
    }
  }

  async handlePrivacyToggle(event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    this.privateAccount = checked;

    try {
      await firstValueFrom(this.api.put('/userProfile/privacy', { isPublic: !checked }));

      if (this.user) {
        const storedUser = { ...this.user };
        if (storedUser.userProfile) {
          storedUser.userProfile = { ...storedUser.userProfile, isPublic: !checked };
        }
        this.authService.updateUser(storedUser);
      }
    } catch (err) {
      console.error('Failed to update privacy settings', err);
      this.privateAccount = !checked;
    }
  }

  async handleSaveAccountDetails() {
    const username = this.accountUsername.trim();
    const email = this.accountEmail.trim();
    if (!username || !email) {
      alert('Username and email are required.');
      return;
    }

    this.savingAccount = true;
    try {
      const response: any = await firstValueFrom(this.api.put('/settings/account', { username, email }));
      if (response?.token) {
        localStorage.setItem('token', response.token);
      }

      const updatedUser = response?.user || (this.user ? { ...this.user, username, email } : null);
      if (updatedUser) {
        this.authService.updateUser(updatedUser);
      }

      alert(response?.message || 'Account details updated successfully.');
    } catch (err: any) {
      console.error('Failed to update account details', err);
      alert(err?.error || 'Failed to update account details.');
    } finally {
      this.savingAccount = false;
    }
  }

  private resolvePrivateAccount(user: any): boolean {
    if (!user) {
      return false;
    }

    if (user?.userProfile && user.userProfile.isPublic === false) {
      return true;
    }

    if (user?.creatorProfile && user.creatorProfile.isPublic === false) {
      return true;
    }

    if (user?.businessProfile && user.businessProfile.isPublic === false) {
      return true;
    }

    return false;
  }
}
