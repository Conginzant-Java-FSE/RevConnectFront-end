import { Component, Input, Output, EventEmitter, OnChanges, OnDestroy, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { firstValueFrom } from 'rxjs';
import { StoryService } from '../../services/story.service';
import { FeedRefreshService } from '../../services/feed-refresh.service';

type SelectedMediaItem = {
    url: string;
    type: 'IMAGE' | 'VIDEO';
    sourceFile?: File;
    objectUrl?: boolean;
    normalized?: boolean;
};

@Component({
    selector: 'app-create-modal',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './create-modal.component.html',
    styleUrl: './create-modal.component.css'
})
export class CreateModalComponent implements OnChanges, OnDestroy {
    private static readonly MAX_MEDIA_SIZE_MB = 1024;
    private static readonly POST_ASPECT = 4 / 5;
    private static readonly STORY_ASPECT = 9 / 16;
    private static readonly POST_MAX_DIMENSION = 1440;
    private static readonly STORY_MAX_DIMENSION = 1080;
    private static readonly STORY_MAX_BYTES = 750 * 1024;
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
    storyService = inject(StoryService);
    feedRefreshService = inject(FeedRefreshService);

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
    readonly hourOptions = Array.from({ length: 12 }, (_, i) => `${i + 1}`);
    readonly minuteOptions = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));
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
    isDeletingStory = false;
    showStoryViewers = false;
    storyViewers: Array<{ id: number; username: string; avatarUrl?: string; viewedAt?: string }> = [];
    loadingStoryViewers = false;
    private autoAdvanceTimer: any = null;
    private tagSuggestTimer: any = null;

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
        return this.createSubMode === 'POST' ? 'image/*,video/*' : 'image/*,video/*';
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

    async handleFileChange(event: Event) {
        const input = event.target as HTMLInputElement;
        if (!input.files || input.files.length === 0) return;

        const files = Array.from(input.files);
        if (this.createSubMode === 'STORY') {
            const firstFile = files[0];
            if (!firstFile) {
                return;
            }
            if (firstFile.size > CreateModalComponent.MAX_MEDIA_SIZE_MB * 1024 * 1024) {
                const message = 'Size is more. Max 1GB only.';
                this.error = message;
                alert(message);
                return;
            }

            this.revokeObjectUrls();
            const storyType: 'IMAGE' | 'VIDEO' = firstFile.type.startsWith('video/') ? 'VIDEO' : 'IMAGE';
            let preparedFile = firstFile;
            let normalized = false;
            if (storyType === 'IMAGE') {
                try {
                    preparedFile = await this.prepareImageForStory(firstFile);
                    normalized = true;
                } catch {
                    preparedFile = firstFile;
                }
            }
            const previewUrl = URL.createObjectURL(preparedFile);
            const storyItem: SelectedMediaItem = {
                url: previewUrl,
                type: storyType,
                sourceFile: preparedFile,
                objectUrl: true,
                normalized
            };
            this.selectedMedia = [storyItem];
            this.activeMediaIndex = 0;
            this.mediaUrl = previewUrl;
            this.mediaType = storyType;
            this.error = '';
            return;
        }

        const oversizedMedia = files.find(
            file => file.size > CreateModalComponent.MAX_MEDIA_SIZE_MB * 1024 * 1024
        );
        if (oversizedMedia) {
            const message = 'Size is more. Max 1GB only.';
            this.error = message;
            alert(message);
            return;
        }

        const selected: SelectedMediaItem[] = [];
        for (const file of files) {
            const type: 'IMAGE' | 'VIDEO' = file.type.startsWith('video/') ? 'VIDEO' : 'IMAGE';
            let preparedFile = file;
            let normalized = false;
            if (type === 'IMAGE') {
                try {
                    preparedFile = await this.prepareImageForPost(file);
                    normalized = true;
                } catch {
                    preparedFile = file;
                }
            }
            selected.push({
                url: URL.createObjectURL(preparedFile),
                type,
                sourceFile: preparedFile,
                objectUrl: true,
                normalized
            });
        }

        this.selectedMedia = [...this.selectedMedia, ...selected];
        if (this.selectedMedia.length > 0) {
            this.activeMediaIndex = Math.max(0, this.selectedMedia.length - selected.length);
            const active = this.selectedMedia[this.activeMediaIndex];
            this.mediaUrl = active.url;
            this.mediaType = active.type;
            this.error = '';
        }
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
                    storyMediaUrl = active.normalized
                        ? await this.readFile(active.sourceFile)
                        : await this.prepareStoryUploadMedia(active.sourceFile, active.type);
                }
                await firstValueFrom(this.api.post('/stories', {
                    mediaUrl: storyMediaUrl,
                    mediaType: active?.type || this.mediaType || 'IMAGE',
                    subscriberOnly: this.isCreatorUser ? this.subscriberOnlyStory : false
                }));
                this.feedRefreshService.notify('story');
            } else {
                const mediaBatch = this.selectedMedia.length > 0
                    ? this.selectedMedia
                    : [{ url: this.mediaUrl, type: this.mediaType }];
                const uploadMediaBatch = await Promise.all(
                    mediaBatch.map(async (item: SelectedMediaItem | { url: string; type: 'IMAGE' | 'VIDEO' }) => ({
                        url: await this.preparePostUploadMedia(item),
                        type: item.type
                    }))
                );
                const payloadMediaUrl = uploadMediaBatch.length > 1
                    ? JSON.stringify(uploadMediaBatch)
                    : uploadMediaBatch[0].url;
                const payloadMediaType = uploadMediaBatch.length > 1
                    ? 'CAROUSEL'
                    : uploadMediaBatch[0].type;

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
                this.feedRefreshService.notify('post');
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
            const serverMessage = (err as any)?.error?.message
                || (typeof (err as any)?.error === 'string' ? (err as any).error : '');
            this.error = serverMessage || `Failed to post ${this.createSubMode.toLowerCase()}. Please try again.`;
            if (this.error.toLowerCase().includes('max 1gb')) {
                alert(this.error);
            }
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
        if (this.viewStoryIsVideo) {
            return;
        }
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
        this.revokeItemObjectUrl(this.selectedMedia[index]);
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
            this.revokeItemObjectUrl(item);
        }
    }

    private revokeItemObjectUrl(item: SelectedMediaItem | null | undefined) {
        if (item?.objectUrl && item.url) {
            URL.revokeObjectURL(item.url);
        }
    }

    handleStoryVideoEnded() {
        this.handleViewNext();
    }

    onCollaboratorToggle() {
        if (!this.addCollaborator) {
            this.collaboratorUsername = '';
        }
    }

    get canDeleteStory(): boolean {
        const ownerId = Number(this.activeStory?.userId || this.activeStory?.user?.id);
        const currentId = Number(this.authService.currentUser?.id);
        if (ownerId && currentId && ownerId === currentId) {
            return true;
        }
        const ownerUsername = (this.activeStory?.username || this.activeStory?.user?.username || '').toString().toLowerCase();
        const currentUsername = (this.authService.currentUser?.username || '').toString().toLowerCase();
        return !!ownerUsername && !!currentUsername && ownerUsername === currentUsername;
    }

    get canViewStoryViewers(): boolean {
        return this.canDeleteStory;
    }

    async handleDeleteStory(event?: Event) {
        event?.stopPropagation();
        if (!this.activeStory || this.isDeletingStory) {
            return;
        }
        if (!this.canDeleteStory) {
            return;
        }
        if (!window.confirm('Delete this story?')) {
            return;
        }
        const storyId = Number(this.activeStory?.id);
        if (!storyId) {
            return;
        }
        this.isDeletingStory = true;
        try {
            await firstValueFrom(this.storyService.deleteStory(storyId));
            this.onStoryCreated.emit();
            this.onViewStoryAdvance.emit();
            alert('Story deleted successfully.');
        } catch (err) {
            console.error('Failed to delete story', err);
            alert('Failed to delete story.');
        } finally {
            this.isDeletingStory = false;
        }
    }

    async openStoryViewers(event?: Event) {
        event?.stopPropagation();
        if (!this.activeStory?.id || !this.canViewStoryViewers) {
            return;
        }

        this.showStoryViewers = true;
        this.loadingStoryViewers = true;
        this.storyViewers = [];
        try {
            const viewers = await firstValueFrom(this.api.get<any[]>(`/stories/${this.activeStory.id}/viewers`));
            this.storyViewers = (viewers || []).map(viewer => ({
                id: Number(viewer?.id) || 0,
                username: (viewer?.username || '').toString(),
                avatarUrl: viewer?.avatarUrl || '',
                viewedAt: viewer?.viewedAt
            }));
        } catch (err) {
            console.error('Failed to load story viewers', err);
            this.storyViewers = [];
        } finally {
            this.loadingStoryViewers = false;
        }
    }

    closeStoryViewers() {
        this.showStoryViewers = false;
        this.storyViewers = [];
        this.loadingStoryViewers = false;
    }

    private async prepareStoryUploadMedia(file: File, mediaType: 'IMAGE' | 'VIDEO'): Promise<string> {
        if (mediaType === 'VIDEO') {
            return this.readFile(file);
        }

        try {
            const optimized = await this.prepareImageForStory(file);
            return this.readFile(optimized);
        } catch {
            // Fallback: keep upload resilient even if optimization fails.
            return this.readFile(file);
        }
    }

    private async preparePostUploadMedia(item: SelectedMediaItem | { url: string; type: 'IMAGE' | 'VIDEO' }): Promise<string> {
        const sourceFile = (item as SelectedMediaItem).sourceFile;
        if (sourceFile) {
            const normalized = (item as SelectedMediaItem).normalized;
            if (normalized) {
                return this.readFile(sourceFile);
            }
            if ((item as SelectedMediaItem).type === 'IMAGE') {
                try {
                    const optimized = await this.prepareImageForPost(sourceFile);
                    return this.readFile(optimized);
                } catch {
                    return this.readFile(sourceFile);
                }
            }
            return this.readFile(sourceFile);
        }
        return item.url;
    }

    private async prepareImageForPost(file: File): Promise<File> {
        return this.cropAndCompressImage(
            file,
            CreateModalComponent.POST_ASPECT,
            CreateModalComponent.POST_MAX_DIMENSION,
            0.88,
            'post'
        );
    }

    private async prepareImageForStory(file: File): Promise<File> {
        const firstPass = await this.cropAndCompressImage(
            file,
            CreateModalComponent.STORY_ASPECT,
            CreateModalComponent.STORY_MAX_DIMENSION,
            0.82,
            'story'
        );
        if (firstPass.size <= CreateModalComponent.STORY_MAX_BYTES) {
            return firstPass;
        }
        return this.cropAndCompressImage(
            firstPass,
            CreateModalComponent.STORY_ASPECT,
            900,
            0.72,
            'story'
        );
    }

    private async cropAndCompressImage(file: File, targetAspect: number, maxDimension: number, quality: number, namePrefix: string): Promise<File> {
        const objectUrl = URL.createObjectURL(file);
        try {
            const image = await this.loadImage(objectUrl);
            const originalWidth = image.naturalWidth || image.width;
            const originalHeight = image.naturalHeight || image.height;
            if (!originalWidth || !originalHeight) {
                throw new Error('Invalid image dimensions');
            }

            let cropWidth = originalWidth;
            let cropHeight = originalHeight;
            let cropX = 0;
            let cropY = 0;
            if (Number.isFinite(targetAspect) && targetAspect > 0) {
                const currentAspect = originalWidth / originalHeight;
                if (currentAspect > targetAspect) {
                    cropWidth = Math.round(originalHeight * targetAspect);
                    cropX = Math.round((originalWidth - cropWidth) / 2);
                } else if (currentAspect < targetAspect) {
                    cropHeight = Math.round(originalWidth / targetAspect);
                    cropY = Math.round((originalHeight - cropHeight) / 2);
                }
            }

            const scale = Math.min(1, maxDimension / Math.max(cropWidth, cropHeight));
            const targetWidth = Math.max(1, Math.round(cropWidth * scale));
            const targetHeight = Math.max(1, Math.round(cropHeight * scale));
            const canvas = document.createElement('canvas');
            canvas.width = targetWidth;
            canvas.height = targetHeight;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                throw new Error('Canvas context unavailable');
            }
            ctx.drawImage(image, cropX, cropY, cropWidth, cropHeight, 0, 0, targetWidth, targetHeight);

            const blob = await new Promise<Blob>((resolve, reject) => {
                canvas.toBlob(
                    value => (value ? resolve(value) : reject(new Error('Compression failed'))),
                    'image/jpeg',
                    quality
                );
            });

            return new File([blob], `${namePrefix}-${Date.now()}.jpg`, { type: 'image/jpeg' });
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
