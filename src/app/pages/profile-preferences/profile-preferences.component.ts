import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom, Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-profile-preferences',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './profile-preferences.component.html',
  styleUrl: './profile-preferences.component.css'
})
export class ProfilePreferencesComponent implements OnInit, OnDestroy {
  authService = inject(AuthService);
  api = inject(ApiService);

  profileData: any = {};
  creatorLinksInput = '';
  creatorEligibility: any = null;
  saving = false;
  saveMessage = { text: '', type: '' };

  user: any = null;
  private userSub!: Subscription;

  ngOnInit() {
    this.userSub = this.authService.user$.subscribe(user => {
      this.user = user;
      this.initProfileData();
    });
  }

  ngOnDestroy() {
    if (this.userSub) {
      this.userSub.unsubscribe();
    }
  }

  initProfileData() {
    if (!this.user) {
      return;
    }

    if (this.user.role === 'USER') {
      this.profileData = { ...this.user.userProfile };
      this.creatorEligibility = null;
    } else if (this.user.role === 'CREATER') {
      this.profileData = { ...this.user.creatorProfile };
      this.profileData.profileGridLayout = this.profileData.profileGridLayout || 'CLASSIC';
      this.creatorLinksInput = (this.profileData.linkInBioLinks || []).join('\n');
      this.fetchCreatorEligibility();
    } else if (this.user.role === 'Business_Account_User') {
      this.profileData = { ...this.user.businessProfile };
      this.creatorEligibility = null;
    }
  }

  async saveProfileDetails() {
    if (!this.user) {
      return;
    }

    this.saving = true;
    this.saveMessage = { text: '', type: '' };

    try {
      let updatedUser = { ...this.user };

      if (this.user.role === 'USER') {
        const response: any = await firstValueFrom(
          this.api.post(`/userProfile/addUserProfile/${this.user.id}`, this.profileData)
        );
        updatedUser = { ...this.user, userProfile: response };
      } else if (this.user.role === 'CREATER') {
        const creatorPayload = {
          ...this.profileData,
          profileGridLayout: this.profileData.profileGridLayout || 'CLASSIC',
          linkInBioLinks: this.creatorLinksInput
            .split(/\r?\n/)
            .map((line: string) => line.trim())
            .filter(Boolean)
        };
        const response: any = await firstValueFrom(this.api.post('/creatorProfile/save', creatorPayload));
        updatedUser = { ...this.user, creatorProfile: response };
        this.profileData = { ...response };
        this.creatorLinksInput = (response.linkInBioLinks || []).join('\n');
        await this.fetchCreatorEligibility();
      } else if (this.user.role === 'Business_Account_User') {
        const response: any = await firstValueFrom(this.api.post('/business/profile', this.profileData));
        updatedUser = { ...this.user, businessProfile: response };
      }

      if (!updatedUser.id) {
        updatedUser.id = this.user.id;
      }
      if (!updatedUser.username) {
        updatedUser.username = this.user.username;
      }

      this.authService.updateUser(updatedUser);
      this.saveMessage = { text: 'Profile preferences saved.', type: 'success' };
    } catch (err) {
      console.error('Failed to update profile preferences', err);
      this.saveMessage = { text: 'Failed to save profile preferences.', type: 'error' };
    } finally {
      this.saving = false;
      setTimeout(() => {
        this.saveMessage = { text: '', type: '' };
      }, 3000);
    }
  }

  async fetchCreatorEligibility() {
    if (this.user?.role !== 'CREATER') {
      this.creatorEligibility = null;
      return;
    }

    try {
      this.creatorEligibility = await firstValueFrom(this.api.get<any>('/creatorProfile/verified-eligibility'));
    } catch (err) {
      console.error('Failed to fetch creator eligibility', err);
      this.creatorEligibility = null;
    }
  }
}
