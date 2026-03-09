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
            const [usersResult, followingResult, sentRequestsResult] = await Promise.allSettled([
                firstValueFrom(this.api.get<any[]>('/auth/search?query=')),
                firstValueFrom(this.api.get<any[]>('/revconnect/users/following')),
                firstValueFrom(this.api.get<any[]>('/follow/requests/sent'))
            ]);
            const users = usersResult.status === 'fulfilled' ? usersResult.value : [];
            const followingRes = followingResult.status === 'fulfilled' ? followingResult.value : [];
            const sentRequestsRes = sentRequestsResult.status === 'fulfilled' ? sentRequestsResult.value : [];

            if (this.user && users) {
                const followingUsernames = new Set(
                    (followingRes || [])
                        .map(entry => (entry?.followingUsername || '').toString().toLowerCase())
                        .filter(Boolean)
                );
                const followingIds = new Set(
                    (followingRes || [])
                        .map(entry => Number(entry?.followingId))
                        .filter(id => Number.isFinite(id))
                );
                const pendingRequestIds = new Set(
                    (sentRequestsRes || [])
                        .filter(request => (request?.status || '').toString().toUpperCase() === 'PENDING')
                        .map(request => Number(request?.receiver?.id))
                        .filter(id => Number.isFinite(id))
                );

                this.suggestions = users
                    .filter(u => this.user && u.username !== this.user.username)
                    .slice(0, 5)
                    .map(u => {
                        const username = (u?.username || '').toString().toLowerCase();
                        const id = Number(u?.id);
                        let status: 'Follow' | 'Following' | 'Pending' = 'Follow';

                        if (followingUsernames.has(username) || (Number.isFinite(id) && followingIds.has(id))) {
                            status = 'Following';
                        } else if (Number.isFinite(id) && pendingRequestIds.has(id)) {
                            status = 'Pending';
                        }

                        return { ...u, status };
                    });
            }
        } catch (err) {
            console.error("Failed to load suggestions", err);
        }
    }

    async connect(userId: number, index: number, event: Event) {
        event.stopPropagation();
        const currentStatus = this.suggestions[index]?.status;
        try {
            if (currentStatus === 'Following') {
                await firstValueFrom(this.api.delete(`/revconnect/users/following/${userId}`, { responseType: 'text' as 'json' }));
                this.suggestions[index].status = 'Follow';
                return;
            }

            if (currentStatus === 'Pending') {
                return;
            }

            const response = await firstValueFrom(this.api.post<any>(`/follow/request/${userId}`, {}));
            this.suggestions[index].status = this.mapFollowStatusFromResponse(response);
        } catch (err: any) {
            const message = this.extractErrorMessage(err);
            if (message.includes('already following') || message.includes('already followed')) {
                this.suggestions[index].status = 'Following';
                return;
            }
            if (message.includes('pending') || message.includes('already requested')) {
                this.suggestions[index].status = 'Pending';
                return;
            }
            if (message.includes('could not') || message.includes('failed') || message.includes('error')) {
                try {
                    if (currentStatus === 'Following') {
                        await firstValueFrom(this.api.delete(`/revconnect/users/following/username/${encodeURIComponent(this.suggestions[index]?.username || '')}`, { responseType: 'text' as 'json' }));
                        this.suggestions[index].status = 'Follow';
                    } else {
                        await firstValueFrom(this.api.post<any>(`/revconnect/users/following/${userId}`, {}));
                        this.suggestions[index].status = 'Following';
                    }
                    return;
                } catch {
                    // fall through to alert
                }
            }
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

    private extractErrorMessage(err: any): string {
        const raw = typeof err?.error === 'string'
            ? err.error
            : err?.error?.message || err?.message || '';
        return raw.toString().toLowerCase();
    }
}
