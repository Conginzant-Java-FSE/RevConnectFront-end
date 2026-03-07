import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { ApiService } from '../../../services/api.service';
import { firstValueFrom } from 'rxjs';

@Component({
    selector: 'app-profile-setup',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './profile-setup.component.html',
    styleUrl: './profile-setup.component.css' // We can reuse auth.css or define inline if needed
})
export class ProfileSetupComponent implements OnInit {
    authService = inject(AuthService);
    api = inject(ApiService);
    router = inject(Router);

    formData: any = {};
    loading = false;
    error = '';

    user: any = null;
    role: string = '';

    ngOnInit() {
        this.authService.user$.subscribe(user => {
            if (user) {
                this.user = user;
                this.role = user.role;
            }
        });
    }

    async handleSubmit(event: Event) {
        event.preventDefault();
        this.loading = true;
        this.error = '';

        try {
            if (this.role === 'USER') {
                const response = await firstValueFrom(this.api.post(`/userProfile/addUserProfile/${this.user.id}`, this.formData));
                const updatedUser = { ...this.user, userProfile: response };
                this.authService.updateUser(updatedUser);
            } else if (this.role === 'CREATER') {
                const creatorPayload = {
                    ...this.formData,
                    linkInBioLinks: (this.formData.creatorLinks || '')
                        .split(/\r?\n/)
                        .map((x: string) => x.trim())
                        .filter((x: string) => !!x)
                };
                delete creatorPayload.creatorLinks;

                const response = await firstValueFrom(this.api.post('/creatorProfile/save', creatorPayload));
                const updatedUser = { ...this.user, creatorProfile: response };
                this.authService.updateUser(updatedUser);
            } else if (this.role === 'Business_Account_User') {
                const response = await firstValueFrom(this.api.post('/business/profile', this.formData));
                const updatedUser = { ...this.user, businessProfile: response };
                this.authService.updateUser(updatedUser);
            }
            this.router.navigate(['/']);
        } catch (err: any) {
            console.error('Failed to setup profile:', err);
            this.error = err.error?.message || 'Failed to setup profile. Please try again.';
        } finally {
            this.loading = false;
        }
    }
}
