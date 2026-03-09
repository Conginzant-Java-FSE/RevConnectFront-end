import { Component, Input, Output, EventEmitter, OnChanges, OnDestroy, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { firstValueFrom } from 'rxjs';

type SelectedMediaItem = {
    url: string;
    type: 'IMAGE' | 'VIDEO';
    sourceFile?: File;
    objectUrl?: boolean;
};

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
    @Input() activeStoryIndex = 0;
    @Input() storyCount = 1;

    @Output() onClose = new EventEmitter<void>();
    @Output() onStoryCreated = new EventEmitter<void>();
    @Output() onViewStoryAdvance = new EventEmitter<void>();
    @Output() onViewStoryBack = new EventEmitter<void>();

    api = inject(ApiService);
    authService = inject(AuthService);

    mediaUrl = '';
    mediaType: 'IMAGE' | 'VIDEO' = 'IMAGE';
    selectedMedia: SelectedMediaItem[] = [];
    activeMediaIndex = 0;
    description = '';
    hashtags = '';
    productLink = '';
    tagPeople = '';
    tagSuggestions: string[] = [];
    showTagSuggestions = false;
    activeTagSuggestionIndex = -1;
    loadingTagSuggestions = false;
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
    private tagSuggestTimer: any = null;
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
        this.revokeObjectUrls();
        if (this.tagSuggestTimer) {
            clearTimeout(this.tagSuggestTimer);
            this.tagSuggestTimer = null;
        }
    }

    get isCreatorUser(): boolean {
        return this.authService.currentUser?.role === 'CREATER';
    }

    get acceptedMediaTypes(): string {
        return this.createSubMode === 'POST' ? 'image/*,video/*' : 'image/*';
    }

    get activeMedia() {
        return this.selectedMedia[this.activeMediaIndex] || null;
    }

    get hasSelectedMedia(): boolean {
        return this.selectedMedia.length > 0;
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

        this.error = '';
        if (mode === 'STORY' && this.selectedMedia.some(item => item.type === 'VIDEO')) {
            this.selectedMedia = this.selectedMedia.filter(item => item.type === 'IMAGE').slice(0, 1);
            this.activeMediaIndex = 0;
            const active = this.selectedMedia[0];
            this.mediaUrl = active?.url || '';
            this.mediaType = active?.type || 'IMAGE';
            this.error = 'Stories currently support images only. Please choose an image.';
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

        const files = Array.from(input.files);
        if (this.createSubMode === 'STORY') {
            const firstFile = files[0];
            if (!firstFile) {
                return;
            }
            if (firstFile.type.startsWith('video/')) {
                this.error = 'Stories currently support images only. Please choose an image.';
                return;
            }

            this.revokeObjectUrls();
            const previewUrl = URL.createObjectURL(firstFile);
            const storyItem: SelectedMediaItem = {
                url: previewUrl,
                type: 'IMAGE',
                sourceFile: firstFile,
                objectUrl: true
            };
            this.selectedMedia = [storyItem];
            this.activeMediaIndex = 0;
            this.mediaUrl = previewUrl;
            this.mediaType = 'IMAGE';
            this.error = '';
            return;
        }

        const fileReaders = files.map(file => this.readFile(file).then(url => ({
            url,
            type: file.type.startsWith('video/') ? 'VIDEO' as const : 'IMAGE' as const,
            sourceFile: file
        })));

        Promise.all(fileReaders).then(items => {
            let selected = items;
            this.selectedMedia = [...this.selectedMedia, ...selected];

            if (this.selectedMedia.length > 0) {
                this.activeMediaIndex = Math.max(0, this.selectedMedia.length - selected.length);
                const active = this.selectedMedia[this.activeMediaIndex];
                this.mediaUrl = active.url;
                this.mediaType = active.type;
                this.error = '';
            }
        });
    }

    get storySegments(): number[] {
        const total = Number.isFinite(this.storyCount) ? Math.max(1, Math.floor(this.storyCount)) : 1;
        return Array.from({ length: total }, (_, index) => index);
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
                const active = this.selectedMedia[0];
                let storyMediaUrl = this.mediaUrl;
                if (active?.sourceFile) {
                    storyMediaUrl = await this.prepareStoryUploadMedia(active.sourceFile);
                }
                await firstValueFrom(this.api.post('/stories', {
                    mediaUrl: storyMediaUrl,
                    mediaType: 'IMAGE',
                    subscriberOnly: this.isCreatorUser ? this.subscriberOnlyStory : false
                }));
            } else {
                const mediaBatch = this.selectedMedia.length > 0
                    ? this.selectedMedia
                    : [{ url: this.mediaUrl, type: this.mediaType }];
                const payloadMediaUrl = mediaBatch.length > 1 ? JSON.stringify(mediaBatch) : mediaBatch[0].url;
                const payloadMediaType = mediaBatch.length > 1 ? 'CAROUSEL' : mediaBatch[0].type;

                await firstValueFrom(this.api.post('/revconnect/users/addPost', {
                    mediaUrl: payloadMediaUrl,
                    mediaType: payloadMediaType,
                    description: this.buildPostDescription(),
                    taggedUsernames: this.buildTaggedUsernames(),
                    hashtags: this.hashtags,
                    productLink: this.productLink.trim() || null,
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
            this.revokeObjectUrls();
            this.selectedMedia = [];
            this.activeMediaIndex = 0;
            this.description = '';
            this.hashtags = '';
            this.productLink = '';
            this.tagPeople = '';
            this.tagSuggestions = [];
            this.showTagSuggestions = false;
            this.activeTagSuggestionIndex = -1;
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

    selectMediaIndex(index: number) {
        if (index < 0 || index >= this.selectedMedia.length) {
            return;
        }
        this.activeMediaIndex = index;
        const active = this.selectedMedia[index];
        this.mediaUrl = active.url;
        this.mediaType = active.type;
    }

    removeMediaAt(index: number) {
        if (index < 0 || index >= this.selectedMedia.length) {
            return;
        }
        this.selectedMedia.splice(index, 1);
        if (this.selectedMedia.length === 0) {
            this.activeMediaIndex = 0;
            this.mediaUrl = '';
            this.mediaType = 'IMAGE';
            return;
        }
        this.activeMediaIndex = Math.min(this.activeMediaIndex, this.selectedMedia.length - 1);
        const active = this.selectedMedia[this.activeMediaIndex];
        this.mediaUrl = active.url;
        this.mediaType = active.type;
    }

    clearSelectedMedia() {
        this.revokeObjectUrls();
        this.selectedMedia = [];
        this.activeMediaIndex = 0;
        this.mediaUrl = '';
        this.mediaType = 'IMAGE';
        this.error = '';
    }

    onTagPeopleInput() {
        const query = this.getActiveTagQuery();
        if (!query || query.length < 1) {
            this.tagSuggestions = [];
            this.showTagSuggestions = false;
            this.activeTagSuggestionIndex = -1;
            this.loadingTagSuggestions = false;
            return;
        }

        if (this.tagSuggestTimer) {
            clearTimeout(this.tagSuggestTimer);
        }

        this.loadingTagSuggestions = true;
        this.tagSuggestTimer = setTimeout(async () => {
            try {
                const users = await firstValueFrom(this.api.get<any[]>(`/auth/search?query=${encodeURIComponent(query)}`));
                const currentUsername = (this.authService.currentUser?.username || '').toLowerCase();
                const unique = new Set<string>();
                const suggestions: string[] = [];
                for (const user of users || []) {
                    const username = (user?.username || '').toString().trim();
                    if (!username) {
                        continue;
                    }
                    const lowered = username.toLowerCase();
                    if (lowered === currentUsername || unique.has(lowered)) {
                        continue;
                    }
                    unique.add(lowered);
                    suggestions.push(username);
                    if (suggestions.length >= 8) {
                        break;
                    }
                }
                this.tagSuggestions = suggestions;
                this.showTagSuggestions = suggestions.length > 0;
                this.activeTagSuggestionIndex = suggestions.length > 0 ? 0 : -1;
            } catch {
                this.tagSuggestions = [];
                this.showTagSuggestions = false;
                this.activeTagSuggestionIndex = -1;
            } finally {
                this.loadingTagSuggestions = false;
            }
        }, 220);
    }

    onTagPeopleBlur() {
        setTimeout(() => {
            this.showTagSuggestions = false;
            this.activeTagSuggestionIndex = -1;
        }, 120);
    }

    onTagPeopleKeydown(event: KeyboardEvent) {
        if (!this.showTagSuggestions || this.tagSuggestions.length === 0) {
            return;
        }

        if (event.key === 'ArrowDown') {
            event.preventDefault();
            this.activeTagSuggestionIndex = (this.activeTagSuggestionIndex + 1) % this.tagSuggestions.length;
            return;
        }

        if (event.key === 'ArrowUp') {
            event.preventDefault();
            this.activeTagSuggestionIndex = this.activeTagSuggestionIndex <= 0
                ? this.tagSuggestions.length - 1
                : this.activeTagSuggestionIndex - 1;
            return;
        }

        if (event.key === 'Enter') {
            event.preventDefault();
            const selected = this.tagSuggestions[this.activeTagSuggestionIndex] || this.tagSuggestions[0];
            if (selected) {
                this.applyTagSuggestion(selected);
            }
            return;
        }

        if (event.key === 'Escape') {
            this.showTagSuggestions = false;
            this.activeTagSuggestionIndex = -1;
        }
    }

    applyTagSuggestion(username: string) {
        const value = (this.tagPeople || '').trimEnd();
        const tokenMatch = value.match(/(?:^|[,\s])@?([A-Za-z0-9._]*)$/);
        if (!tokenMatch) {
            this.tagPeople = value ? `${value}, ${username}` : username;
        } else {
            const tokenLength = tokenMatch[1]?.length ?? 0;
            const replaceFrom = value.length - tokenLength;
            const keepPrefix = value.slice(0, replaceFrom);
            this.tagPeople = `${keepPrefix}${username}, `;
        }

        this.showTagSuggestions = false;
        this.activeTagSuggestionIndex = -1;
    }

    private getActiveTagQuery(): string {
        const value = (this.tagPeople || '').trimEnd();
        const tokenMatch = value.match(/(?:^|[,\s])@?([A-Za-z0-9._]*)$/);
        const query = (tokenMatch?.[1] || '').trim();
        return query;
    }

    getStorySegmentClass(index: number): 'filled' | 'active' | 'idle' {
        if (index < this.activeStoryIndex) {
            return 'filled';
        }
        if (index === this.activeStoryIndex) {
            return 'active';
        }
        return 'idle';
    }

    private buildPostDescription(): string {
        const baseDescription = (this.description || '').trim();
        const tags = this.buildTaggedUsernames().map(value => `@${value}`);
        if (tags.length === 0) {
            return baseDescription;
        }

        const existingMentions = new Set(
            (baseDescription.match(/@([A-Za-z0-9._]{2,30})/g) || []).map(value => value.toLowerCase())
        );
        const uniqueTags = tags.filter(tag => !existingMentions.has(tag.toLowerCase()));
        if (uniqueTags.length === 0) {
            return baseDescription;
        }

        if (!baseDescription) {
            return uniqueTags.join(' ');
        }
        return `${baseDescription}\n\n${uniqueTags.join(' ')}`;
    }

    private buildTaggedUsernames(): string[] {
        const rawTagInput = (this.tagPeople || '').trim();
        if (!rawTagInput) {
            return [];
        }

        const unique = new Set<string>();
        const tags: string[] = [];
        rawTagInput
            .split(/[,\s]+/)
            .map(value => value.trim().replace(/^@+/, ''))
            .filter(value => !!value)
            .forEach(value => {
                const lowered = value.toLowerCase();
                if (unique.has(lowered)) {
                    return;
                }
                unique.add(lowered);
                tags.push(value);
            });
        return tags;
    }

    private readFile(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    private revokeObjectUrls() {
        for (const item of this.selectedMedia) {
            if (item.objectUrl && item.url) {
                URL.revokeObjectURL(item.url);
            }
        }
    }

    private async prepareStoryUploadMedia(file: File): Promise<string> {
        const maxSizeBytes = 750 * 1024;
        const maxDimension = 1080;
        const quality = 0.8;

        try {
            const optimized = await this.compressImageFile(file, maxDimension, quality);
            if (optimized.size <= maxSizeBytes) {
                return this.readFile(optimized);
            }
            // If still large, compress one more pass.
            const secondPass = await this.compressImageFile(optimized, 900, 0.72);
            return this.readFile(secondPass);
        } catch {
            // Fallback: keep upload resilient even if optimization fails.
            return this.readFile(file);
        }
    }

    private async compressImageFile(file: File, maxDimension: number, quality: number): Promise<File> {
        const objectUrl = URL.createObjectURL(file);
        try {
            const image = await this.loadImage(objectUrl);
            const originalWidth = image.naturalWidth || image.width;
            const originalHeight = image.naturalHeight || image.height;
            if (!originalWidth || !originalHeight) {
                throw new Error('Invalid image dimensions');
            }

            const scale = Math.min(1, maxDimension / Math.max(originalWidth, originalHeight));
            const targetWidth = Math.max(1, Math.round(originalWidth * scale));
            const targetHeight = Math.max(1, Math.round(originalHeight * scale));
            const canvas = document.createElement('canvas');
            canvas.width = targetWidth;
            canvas.height = targetHeight;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                throw new Error('Canvas context unavailable');
            }
            ctx.drawImage(image, 0, 0, targetWidth, targetHeight);

            const blob = await new Promise<Blob>((resolve, reject) => {
                canvas.toBlob(
                    value => (value ? resolve(value) : reject(new Error('Compression failed'))),
                    'image/jpeg',
                    quality
                );
            });

            return new File([blob], `story-${Date.now()}.jpg`, { type: 'image/jpeg' });
        } finally {
            URL.revokeObjectURL(objectUrl);
        }
    }

    private loadImage(src: string): Promise<HTMLImageElement> {
        return new Promise((resolve, reject) => {
            const image = new Image();
            image.onload = () => resolve(image);
            image.onerror = () => reject(new Error('Failed to load image'));
            image.src = src;
        });
    }
}
