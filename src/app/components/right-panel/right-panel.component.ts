import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';
import { firstValueFrom } from 'rxjs';

@Component({
    selector: 'app-right-panel',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './right-panel.component.html',
    styleUrl: './right-panel.component.css'
})
export class RightPanelComponent implements OnInit {
    authService = inject(AuthService);
    api = inject(ApiService);
    router = inject(Router);

    suggestions: any[] = [];

    get user() {
        return this.authService.currentUser;
    }

    ngOnInit(): void {
        this.fetchSuggestions();
    }

    async fetchSuggestions() {
        try {
            const res = await firstValueFrom(this.api.get<any[]>('/auth/search?query='));
            if (this.user && res) {
                // Filter out the logged-in user, limit to top 5, and map status
                this.suggestions = res
                    .filter(u => this.user && u.username !== this.user.username)
                    .slice(0, 5)
                    .map(u => ({ ...u, status: 'Follow' }));
            }
        } catch (err) {
            console.error("Failed to load suggestions", err);
        }
    }

    async connect(userId: number, index: number, event: Event) {
        event.stopPropagation();
        if (this.suggestions[index].status !== 'Follow') return;
        try {
            const response = await firstValueFrom(this.api.post<any>(`/follow/request/${userId}`, {}));
            this.suggestions[index].status = this.mapFollowStatusFromResponse(response);
        } catch (err) {
            console.error(err);
            alert('Could not send connection request.');
        }
    }

    goToProfile(username: string) {
        this.router.navigate(['/profile', username]);
    }

    goToMyProfile() {
        const username = this.user?.username;
        if (!username) {
            return;
        }
        this.router.navigate(['/profile', username]);
    }

    private mapFollowStatusFromResponse(response: any): 'Following' | 'Pending' {
        const rawMessage = typeof response === 'string' ? response : response?.message;
        const message = (rawMessage || '').toString().toLowerCase();

        if (message.includes('followed') || message.includes('already following')) {
            return 'Following';
        }

        return 'Pending';
    }
}
