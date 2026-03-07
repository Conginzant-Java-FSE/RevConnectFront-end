import { Component, Input, Output, EventEmitter, OnChanges, OnDestroy, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { firstValueFrom } from 'rxjs';

@Component({
    selector: 'app-create-modal',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './create-modal.component.html',
    styleUrl: './create-modal.component.css'
})
export class CreateModalComponent implements OnChanges, OnDestroy {
    @Input() isOpen = false;
    @Input() mode: 'create' | 'view' = 'create';
    @Input() activeStory: any = null;
    @Input() defaultCreateSubMode: 'POST' | 'STORY' = 'POST';

    @Output() onClose = new EventEmitter<void>();
    @Output() onStoryCreated = new EventEmitter<void>();
    @Output() onViewStoryAdvance = new EventEmitter<void>();
    @Output() onViewStoryBack = new EventEmitter<void>();

    api = inject(ApiService);
    authService = inject(AuthService);

    mediaUrl = '';
    mediaType: 'IMAGE' | 'VIDEO' = 'IMAGE';
    description = '';
    hashtags = '';
    scheduledAt = '';
    scheduleDate = '';
    scheduleHour = '2';
    scheduleMinute = '45';
    scheduleMeridiem: 'AM' | 'PM' = 'AM';
    scheduleEnabled = false;
    subscriberOnlyStory = false;
    collaboratorUsername = '';
    addCollaborator = false;
    seriesName = '';
    seriesOrder: number | null = null;
    createSubMode: 'POST' | 'STORY' = 'POST';
    loading = false;
    error = '';
    private autoAdvanceTimer: any = null;
    readonly hourOptions = Array.from({ length: 12 }, (_, i) => `${i + 1}`);
    readonly minuteOptions = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

    ngOnChanges(changes: SimpleChanges) {
        if (changes['isOpen'] || changes['mode'] || changes['activeStory'] || changes['defaultCreateSubMode']) {
            if (this.mode === 'create' && this.isOpen) {
                this.setCreateSubMode(this.defaultCreateSubMode || 'POST');
            }

            if (this.mode === 'view' && this.isOpen && this.activeStory) {
                this.startAutoAdvanceTimer();
                this.trackStoryView(false);
            } else {
                this.clearAutoAdvanceTimer();
            }
        }
    }

    ngOnDestroy() {
        this.clearAutoAdvanceTimer();
    }

    get isCreatorUser(): boolean {
        return this.authService.currentUser?.role === 'CREATER';
    }

    get acceptedMediaTypes(): string {
        return this.createSubMode === 'POST' ? 'image/*,video/*' : 'image/*';
    }

    get viewStoryUsername(): string {
        return this.activeStory?.username
            || this.activeStory?.user?.username
            || 'Story';
    }

    get viewStoryProfilePic(): string {
        return this.activeStory?.userProfilePic
            || this.activeStory?.user?.profilePictureUrl
            || this.activeStory?.user?.userProfile?.profilepicURL
            || '/assets/default-avatar.svg';
    }

    get viewStoryMediaUrl(): string {
        return this.activeStory?.mediaUrl || '';
    }

    get viewStoryIsVideo(): boolean {
        const mediaType = (this.activeStory?.mediaType || '').toString().toUpperCase();
        if (mediaType === 'VIDEO') {
            return true;
        }
        const url = this.viewStoryMediaUrl;
        if (!url) {
            return false;
        }
        if (url.startsWith('data:video/')) {
            return true;
        }
        const normalized = url.split('?')[0].toLowerCase();
        return ['.mp4', '.webm', '.ogg', '.mov', '.m4v'].some(ext => normalized.endsWith(ext));
    }

    setCreateSubMode(mode: 'POST' | 'STORY') {
        this.createSubMode = mode;

        if (mode === 'STORY' && this.mediaType === 'VIDEO') {
            this.mediaUrl = '';
            this.mediaType = 'IMAGE';
            this.error = 'Stories currently support images only. Please choose an image.';
        } else {
            this.error = '';
        }

        if (mode === 'STORY') {
            this.scheduleEnabled = false;
            this.scheduledAt = '';
            this.scheduleDate = '';
            this.scheduleHour = '2';
            this.scheduleMinute = '45';
            this.scheduleMeridiem = 'AM';
            this.addCollaborator = false;
            this.collaboratorUsername = '';
            this.seriesName = '';
            this.seriesOrder = null;
        }
    }

    handleViewNext() {
        this.trackStoryView(true);
        this.onViewStoryAdvance.emit();
    }

    handleViewBack() {
        this.trackStoryView(true);
        this.onViewStoryBack.emit();
    }

    handleFileChange(event: Event) {
        const input = event.target as HTMLInputElement;
        if (!input.files || input.files.length === 0) return;

        const file = input.files[0];
        const pickedMediaType: 'IMAGE' | 'VIDEO' = file.type.startsWith('video/') ? 'VIDEO' : 'IMAGE';

        if (this.createSubMode === 'STORY' && pickedMediaType === 'VIDEO') {
            this.error = 'Stories currently support images only. Please choose an image.';
            input.value = '';
            return;
        }

        const reader = new FileReader();

        reader.onloadend = () => {
            this.mediaUrl = reader.result as string;
            this.mediaType = pickedMediaType;
            this.error = '';
        };
        reader.readAsDataURL(file);
    }

    async handleSubmit(event: Event) {
        event.preventDefault();
        if (!this.mediaUrl.trim()) {
            this.error = 'Please select or upload media first.';
            return;
        }

        this.loading = true;
        this.error = '';

        try {
            if (this.createSubMode === 'POST' && this.scheduleEnabled) {
                const scheduleIso = this.buildScheduledAtIso();
                if (!scheduleIso) {
                    this.error = 'Please select schedule date and time.';
                    this.loading = false;
                    return;
                }
                this.scheduledAt = scheduleIso;
            }

            if (this.createSubMode === 'STORY') {
                await firstValueFrom(this.api.post('/stories', {
                    mediaUrl: this.mediaUrl,
                    mediaType: 'IMAGE',
                    subscriberOnly: this.isCreatorUser ? this.subscriberOnlyStory : false
                }));
            } else {
                await firstValueFrom(this.api.post('/revconnect/users/addPost', {
                    mediaUrl: this.mediaUrl,
                    mediaType: this.mediaType,
                    description: this.description,
                    hashtags: this.hashtags,
                    scheduledAt: this.scheduleEnabled && this.scheduledAt ? this.scheduledAt : null,
                    collaboratorUsername: this.isCreatorUser && this.addCollaborator
                        ? this.collaboratorUsername.trim()
                        : null,
                    seriesName: this.isCreatorUser ? this.seriesName.trim() : null,
                    seriesOrder: this.isCreatorUser && this.seriesOrder !== null
                        ? Number(this.seriesOrder)
                        : null
                }));
            }

            this.onStoryCreated.emit();
            this.mediaUrl = '';
            this.mediaType = 'IMAGE';
            this.description = '';
            this.hashtags = '';
            this.scheduleEnabled = false;
            this.scheduledAt = '';
            this.scheduleDate = '';
            this.scheduleHour = '2';
            this.scheduleMinute = '45';
            this.scheduleMeridiem = 'AM';
            this.subscriberOnlyStory = false;
            this.collaboratorUsername = '';
            this.addCollaborator = false;
            this.seriesName = '';
            this.seriesOrder = null;
            this.closeModal();
        } catch (err) {
            console.error(err);
            this.error = `Failed to post ${this.createSubMode.toLowerCase()}. Please try again.`;
        } finally {
            this.loading = false;
        }
    }

    closeModal() {
        this.clearAutoAdvanceTimer();
        this.onClose.emit();
    }

    private startAutoAdvanceTimer() {
        this.clearAutoAdvanceTimer();
        this.autoAdvanceTimer = setTimeout(() => {
            this.onViewStoryAdvance.emit();
        }, 5000);
    }

    private clearAutoAdvanceTimer() {
        if (this.autoAdvanceTimer) {
            clearTimeout(this.autoAdvanceTimer);
            this.autoAdvanceTimer = null;
        }
    }

    private trackStoryView(tapThrough: boolean) {
        const storyId = this.activeStory?.id;
        if (!storyId) {
            return;
        }

        firstValueFrom(this.api.post(`/creator/analytics/track/story/${storyId}`, { tapThrough }))
            .catch(() => {
                // no-op: analytics tracking should never block story UX
            });
    }

    private buildScheduledAtIso(): string | null {
        const date = this.scheduleDate?.trim();
        if (!date) {
            return null;
        }

        let hour = Number(this.scheduleHour);
        const minute = Number(this.scheduleMinute);
        if (!Number.isFinite(hour) || !Number.isFinite(minute) || hour < 1 || hour > 12 || minute < 0 || minute > 59) {
            return null;
        }

        if (this.scheduleMeridiem === 'AM') {
            if (hour === 12) {
                hour = 0;
            }
        } else if (hour !== 12) {
            hour += 12;
        }

        const hh = hour.toString().padStart(2, '0');
        const mm = minute.toString().padStart(2, '0');
        return `${date}T${hh}:${mm}:00`;
    }
}
