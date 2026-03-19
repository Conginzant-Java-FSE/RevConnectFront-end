import { AfterViewInit, Component, ElementRef, EventEmitter, HostListener, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-post-card',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './post-card.component.html',
  styleUrl: './post-card.component.css'
})
export class PostCardComponent implements OnInit, OnChanges, AfterViewInit, OnDestroy {
  @Input() post: any;
  @Input() showMobileBack = false;
  @Output() mobileBack = new EventEmitter<void>();
  @ViewChild('postVideo') postVideo?: ElementRef<HTMLVideoElement>;

  api = inject(ApiService);
  authService = inject(AuthService);
  router = inject(Router);

  likeCount = 0;
  saveCount = 0;
  shareCount = 0;
  isLiked = false;
  isSaved = false;
  comments: any[] = [];
  showComments = false;
  newComment = '';
  isSubmitting = false;
  isSaving = false;
  mediaLoadError = '';
  currentMediaIndex = 0;
  showPostOptionsMenu = false;
  isEditingPost = false;
  editPostContent = '';
  isUpdatingPost = false;
  isDeletingPost = false;
  postActionError = '';
  isPostRemoved = false;
  showShareModal = false;
  showLikesModal = false;
  showCommentsModal = false;
  private sheetDragStartY: number | null = null;
  private sheetDragType: 'likes' | 'comments' | null = null;
  isSheetDragging = false;
  likesSheetOffset = 0;
  commentsSheetOffset = 0;
  loadingLikes = false;
  likesUsers: Array<{ id: number; username: string; avatarUrl: string }> = [];
  shareConnections: Array<{ id: number; username: string; selected: boolean }> = [];
  shareMessage = '';
  isSharing = false;
  shareFeedback = '';
  shareSearchQuery = '';
  private videoObserver?: IntersectionObserver;
  private trackedImpression = false;
  private playbackStartedAt: number | null = null;
  private touchStartX: number | null = null;
  private touchStartY: number | null = null;

  get currentUser() {
    return this.authService.currentUser;
  }

  get canManagePost(): boolean {
    return this.isPostOwner || this.isPostCollaborator;
  }

  private get isPostOwner(): boolean {
    const ownerId = Number(this.post?.userId || this.post?.user?.id);
    const loggedInId = Number(this.currentUser?.id);
    if (!!ownerId && !!loggedInId && ownerId === loggedInId) {
      return true;
    }

    const ownerUsername = (this.post?.authorUsername || this.post?.userName || this.post?.user?.username || '')
      .toString()
      .trim()
      .toLowerCase();
    const loggedInUsername = (this.currentUser?.username || '')
      .toString()
      .trim()
      .toLowerCase();

    return !!ownerUsername && !!loggedInUsername && ownerUsername === loggedInUsername;
  }

  private get isPostCollaborator(): boolean {
    if (this.post?.collabAccepted === false) {
      return false;
    }
    const collaboratorId = Number(this.post?.collaboratorId || this.post?.collaborator?.id);
    const loggedInId = Number(this.currentUser?.id);
    if (!!collaboratorId && !!loggedInId && collaboratorId === loggedInId) {
      return true;
    }

    const collaboratorUsername = (this.post?.collaboratorUsername || '')
      .toString()
      .trim()
      .toLowerCase();
    const loggedInUsername = (this.currentUser?.username || '')
      .toString()
      .trim()
      .toLowerCase();
    return !!collaboratorUsername && !!loggedInUsername && collaboratorUsername === loggedInUsername;
  }

  ngOnInit() {
    if (this.post) {
      this.currentMediaIndex = 0;
      this.likeCount = this.post.likeCount || 0;
      this.saveCount = this.post.saveCount || 0;
      this.shareCount = this.post.shareCount || 0;
      this.fetchInteractions();
      this.trackPostView();
    }
  }

  get normalizedShopLink(): string | null {
    const raw = (this.post?.productLink || '').toString().trim();
    if (!raw) {
      return null;
    }
    const normalized = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    try {
      const parsed = new URL(normalized);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return null;
      }
      return parsed.toString();
    } catch {
      return null;
    }
  }

  openShopLink(event: Event) {
    event.stopPropagation();
    const link = this.normalizedShopLink;
    if (!link) {
      return;
    }
    window.open(link, '_blank', 'noopener');
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['post']) {
      this.currentMediaIndex = 0;
      this.mediaLoadError = '';
      setTimeout(() => this.setupVideoAutoplayObserver());
    }
  }

  ngAfterViewInit() {
    this.setupVideoAutoplayObserver();
  }

  ngOnDestroy() {
    this.flushWatchProgress(false);
    this.teardownVideoObserver();
  }

  @HostListener('document:click')
  handleDocumentClick() {
    this.showPostOptionsMenu = false;
  }

  get isVideoPost(): boolean {
    return this.activeMedia?.type === 'VIDEO';
  }

  get postMediaItems(): Array<{ url: string; type: 'IMAGE' | 'VIDEO' }> {
    const rawMedia = this.post?.mediaUrl;
    const fallbackType = (this.post?.mediaType || '').toString().toUpperCase();
    if (!rawMedia) {
      return [];
    }

    if (typeof rawMedia === 'string') {
      const trimmed = rawMedia.trim();
      if (trimmed.startsWith('[')) {
        try {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed)) {
            const normalized = parsed
              .map(item => {
                if (typeof item === 'string') {
                  return {
                    url: item,
                    type: this.isVideoUrl(item) ? 'VIDEO' as const : 'IMAGE' as const
                  };
                }

                const url = (item?.url || item?.mediaUrl || '').toString();
                if (!url) {
                  return null;
                }
                const itemType = (item?.type || item?.mediaType || '').toString().toUpperCase();
                const type = itemType === 'VIDEO' || this.isVideoUrl(url) ? 'VIDEO' as const : 'IMAGE' as const;
                return { url, type };
              })
              .filter(Boolean) as Array<{ url: string; type: 'IMAGE' | 'VIDEO' }>;

            if (normalized.length > 0) {
              return normalized;
            }
          }
        } catch {
          // fallback to single-media mode
        }
      }

      return [{
        url: trimmed,
        type: fallbackType === 'VIDEO' || this.isVideoUrl(trimmed) ? 'VIDEO' : 'IMAGE'
      }];
    }

    return [];
  }

  get hasCarouselMedia(): boolean {
    return this.postMediaItems.length > 1;
  }

  get activeMedia(): { url: string; type: 'IMAGE' | 'VIDEO' } | null {
    if (this.postMediaItems.length === 0) {
      return null;
    }
    const safeIndex = Math.min(Math.max(this.currentMediaIndex, 0), this.postMediaItems.length - 1);
    return this.postMediaItems[safeIndex];
  }

  private isVideoUrl(url: string | undefined): boolean {
    if (!url) {
      return false;
    }

    if (url.startsWith('data:video/')) {
      return true;
    }

    const normalizedUrl = url.split('?')[0].toLowerCase();
    return ['.mp4', '.webm', '.ogg', '.mov', '.m4v'].some(ext => normalizedUrl.endsWith(ext));
  }

  private setupVideoAutoplayObserver() {
    this.teardownVideoObserver();

    if (!this.isVideoPost || !this.postVideo?.nativeElement) {
      return;
    }

    const videoEl = this.postVideo.nativeElement;
    videoEl.muted = true;
    videoEl.playsInline = true;
    videoEl.loop = true;

    this.videoObserver = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (!this.postVideo?.nativeElement) {
            return;
          }

          if (entry.isIntersecting && entry.intersectionRatio >= 0.55) {
            const playPromise = this.postVideo.nativeElement.play();
            if (playPromise) {
              playPromise.catch(() => {
                // Ignore autoplay rejections (browser policy/network timing)
              });
            }
          } else {
            this.postVideo.nativeElement.pause();
          }
        }
      },
      { threshold: [0, 0.25, 0.55, 0.85] }
    );

    this.videoObserver.observe(videoEl);
  }

  private teardownVideoObserver() {
    if (this.videoObserver) {
      this.videoObserver.disconnect();
      this.videoObserver = undefined;
    }

    if (this.postVideo?.nativeElement) {
      this.postVideo.nativeElement.pause();
    }
  }

  handleVideoReady() {
    if (!this.postVideo?.nativeElement) {
      return;
    }

    const playPromise = this.postVideo.nativeElement.play();
    if (playPromise) {
      playPromise.catch(() => {
        // Autoplay can be blocked until user interaction; observer retry handles it.
      });
    }
  }

  handleVideoError() {
    this.mediaLoadError = 'Could not load this video.';
  }

  goToPreviousMedia(event?: Event) {
    event?.stopPropagation();
    if (!this.hasCarouselMedia) {
      return;
    }
    this.currentMediaIndex = (this.currentMediaIndex - 1 + this.postMediaItems.length) % this.postMediaItems.length;
    this.mediaLoadError = '';
    setTimeout(() => this.setupVideoAutoplayObserver());
  }

  goToNextMedia(event?: Event) {
    event?.stopPropagation();
    if (!this.hasCarouselMedia) {
      return;
    }
    this.currentMediaIndex = (this.currentMediaIndex + 1) % this.postMediaItems.length;
    this.mediaLoadError = '';
    setTimeout(() => this.setupVideoAutoplayObserver());
  }

  setMediaIndex(index: number, event?: Event) {
    event?.stopPropagation();
    if (index < 0 || index >= this.postMediaItems.length) {
      return;
    }
    this.currentMediaIndex = index;
    this.mediaLoadError = '';
    setTimeout(() => this.setupVideoAutoplayObserver());
  }

  handleTouchStart(event: TouchEvent) {
    const touch = event.touches?.[0];
    if (!touch) {
      return;
    }
    this.touchStartX = touch.clientX;
    this.touchStartY = touch.clientY;
  }

  handleTouchEnd(event: TouchEvent) {
    if (!this.hasCarouselMedia || this.touchStartX === null || this.touchStartY === null) {
      this.touchStartX = null;
      this.touchStartY = null;
      return;
    }

    const touch = event.changedTouches?.[0];
    if (!touch) {
      this.touchStartX = null;
      this.touchStartY = null;
      return;
    }

    const deltaX = touch.clientX - this.touchStartX;
    const deltaY = touch.clientY - this.touchStartY;
    const swipeThreshold = 35;
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) >= swipeThreshold) {
      if (deltaX < 0) {
        this.goToNextMedia();
      } else {
        this.goToPreviousMedia();
      }
    }

    this.touchStartX = null;
    this.touchStartY = null;
  }

  handleVideoPlay() {
    if (this.playbackStartedAt === null) {
      this.playbackStartedAt = Date.now();
    }
  }

  handleVideoPause() {
    this.flushWatchProgress(false);
  }

  handleVideoEnded() {
    this.flushWatchProgress(true);
  }

  togglePostOptions(event: Event) {
    event.stopPropagation();
    if (!this.canManagePost) {
      return;
    }
    this.showPostOptionsMenu = !this.showPostOptionsMenu;
  }

  startEditPost(event: Event) {
    event.stopPropagation();
    this.showPostOptionsMenu = false;
    this.postActionError = '';
    this.editPostContent = (this.post?.content || this.post?.description || '').toString();
    this.isEditingPost = true;
  }

  closeEditPostModal() {
    this.isEditingPost = false;
    this.editPostContent = '';
    this.isUpdatingPost = false;
  }

  async savePostEdit() {
    const postId = Number(this.post?.postId || this.post?.id);
    if (!postId || this.isUpdatingPost) {
      return;
    }

    this.isUpdatingPost = true;
    this.postActionError = '';
    try {
      const updated = await firstValueFrom(
        this.api.put<any>(`/revconnect/users/posts/${postId}`, {
          description: this.editPostContent.trim()
        })
      );

      const nextDescription = (updated?.description ?? this.editPostContent.trim());
      this.post.description = nextDescription;
      this.post.content = nextDescription;
      this.closeEditPostModal();
    } catch (err) {
      console.error('Failed to update post', err);
      this.postActionError = 'Failed to update post.';
      this.isUpdatingPost = false;
    }
  }

  async handleDeletePost(event: Event) {
    event.stopPropagation();
    const postId = Number(this.post?.postId || this.post?.id);
    if (!postId || this.isDeletingPost) {
      return;
    }

    if (!window.confirm('Delete this post?')) {
      return;
    }

    this.showPostOptionsMenu = false;
    this.isDeletingPost = true;
    this.postActionError = '';

    try {
      if (this.isPostOwner) {
        await firstValueFrom(this.api.delete(`/revconnect/users/posts/${postId}`, { responseType: 'text' as 'json' }));
        this.isPostRemoved = true;
        alert('Post deleted successfully.');
      } else if (this.isPostCollaborator) {
        await firstValueFrom(this.api.put(`/revconnect/users/posts/${postId}/collab/remove`, {}, { responseType: 'text' as 'json' }));
        this.isPostRemoved = true;
        alert('Post removed from your profile.');
      }
    } catch (err) {
      const status = (err as any)?.status;
      if (status === 200 || status === 204) {
        this.isPostRemoved = true;
        alert(this.isPostOwner ? 'Post deleted successfully.' : 'Post removed from your profile.');
      } else {
        console.error('Failed to delete post', err);
        this.postActionError = 'Failed to delete post.';
      }
    } finally {
      this.isDeletingPost = false;
    }
  }

  async fetchInteractions() {
    const postId = this.post.postId || this.post.id;
    if (!postId) return;

    try {
      const statusProm = firstValueFrom(this.api.get<boolean>(`/likes/${postId}/status`));
      const countProm = firstValueFrom(this.api.get<number>(`/likes/${postId}/count`));
      const saveStatusProm = firstValueFrom(this.api.get<boolean>(`/saved/${postId}/status`));
      const saveCountProm = firstValueFrom(this.api.get<number>(`/saved/${postId}/count`));
      const commentsProm = firstValueFrom(this.api.get<any[]>(`/comments/post/${postId}`));

      const [statusRes, countRes, saveStatusRes, saveCountRes, commentsRes] = await Promise.all([
        statusProm,
        countProm,
        saveStatusProm,
        saveCountProm,
        commentsProm
      ]);

      this.isLiked = statusRes;
      this.likeCount = countRes;
      this.isSaved = saveStatusRes;
      this.saveCount = saveCountRes;
      this.comments = commentsRes || [];
      this.post.commentCount = this.comments.length;
    } catch (err) {
      console.error("Failed to load interactions for post:", err);
    }
  }

  async handleLikeToggle() {
    // Optimistic
    this.isLiked = !this.isLiked;
    this.likeCount = this.isLiked ? this.likeCount + 1 : this.likeCount - 1;

    const postId = this.post.postId || this.post.id;
    try {
      await firstValueFrom(this.api.post(`/likes/${postId}`, {}, { responseType: 'text' as 'json' }));
    } catch (err) {
      console.error("Failed to toggle like", err);
      // Revert on failure
      this.isLiked = !this.isLiked;
      this.likeCount = this.isLiked ? this.likeCount + 1 : this.likeCount - 1;
    }
  }

  async handleCommentSubmit() {
    if (!this.newComment.trim() || this.isSubmitting) return;

    this.isSubmitting = true;
    const postId = this.post.postId || this.post.id;

    try {
      const res = await firstValueFrom(this.api.post<any>(`/comments/${postId}`, { content: this.newComment }));
      this.comments.push(res);
      this.post.commentCount = this.comments.length;
      this.newComment = '';
      this.showComments = true;
    } catch (err) {
      console.error("Failed to post comment", err);
    } finally {
      this.isSubmitting = false;
    }
  }

  async handleSaveToggle() {
    const postId = this.post.postId || this.post.id;
    if (!postId || this.isSaving) return;

    this.isSaving = true;
    const nextSaved = !this.isSaved;
    this.isSaved = nextSaved;
    this.saveCount = nextSaved ? this.saveCount + 1 : Math.max(0, this.saveCount - 1);

    try {
      if (nextSaved) {
        await firstValueFrom(this.api.post(`/saved/${postId}`, {}, { responseType: 'text' as 'json' }));
      } else {
        await firstValueFrom(this.api.delete(`/saved/${postId}`, { responseType: 'text' as 'json' }));
      }
    } catch (err) {
      console.error("Failed to toggle save", err);
      // Revert on failure
      this.isSaved = !nextSaved;
      this.saveCount = this.isSaved ? this.saveCount + 1 : Math.max(0, this.saveCount - 1);
    } finally {
      this.isSaving = false;
    }
  }

  async openShareModal() {
    this.showShareModal = true;
    this.shareFeedback = '';
    this.shareMessage = '';
    this.shareSearchQuery = '';
    await this.loadShareConnections();
  }

  closeShareModal() {
    this.showShareModal = false;
    this.shareFeedback = '';
    this.shareConnections = [];
    this.shareMessage = '';
    this.shareSearchQuery = '';
  }

  get selectedShareCount(): number {
    return this.shareConnections.filter(connection => connection.selected).length;
  }

  get filteredShareConnections(): Array<{ id: number; username: string; selected: boolean }> {
    const query = this.shareSearchQuery.trim().toLowerCase();
    if (!query) {
      return this.shareConnections;
    }
    return this.shareConnections.filter(connection =>
      connection.username.toLowerCase().includes(query)
    );
  }

  handleShareSearchInput() {
    this.shareFeedback = '';
  }

  async loadShareConnections() {
    try {
      const [followingRes, followersRes] = await Promise.all([
        firstValueFrom(this.api.get<any[]>('/revconnect/users/following')),
        firstValueFrom(this.api.get<any[]>('/revconnect/users/followers'))
      ]);

      const byId = new Map<number, { id: number; username: string; selected: boolean }>();

      for (const entry of followingRes || []) {
        const id = Number(entry?.followingId);
        const username = (entry?.followingUsername || '').toString().trim();
        if (!id || !username) continue;
        byId.set(id, { id, username, selected: false });
      }

      for (const entry of followersRes || []) {
        const id = Number(entry?.followerId);
        const username = (entry?.followerUsername || '').toString().trim();
        if (!id || !username) continue;
        if (!byId.has(id)) {
          byId.set(id, { id, username, selected: false });
        }
      }

      this.shareConnections = Array.from(byId.values())
        .sort((a, b) => a.username.localeCompare(b.username));
    } catch (err) {
      console.error('Failed to load connections for sharing', err);
      this.shareConnections = [];
    }
  }

  toggleConnectionSelection(connection: { id: number; username: string; selected: boolean }, checked: boolean) {
    connection.selected = checked;
    this.shareFeedback = '';
  }

  private truncateForMessage(content: string, maxLength = 1000): string {
    if (!content || content.length <= maxLength) {
      return content;
    }
    return `${content.slice(0, maxLength - 1).trimEnd()}...`;
  }

  async submitShare() {
    if (this.isSharing || this.selectedShareCount === 0) return;

    this.isSharing = true;
    this.shareFeedback = '';
    try {
      const author = (this.post?.authorUsername || this.post?.userName || 'user').toString().trim();
      const caption = (this.post?.content || this.post?.description || '').toString().trim();
      const postId = Number(this.post?.postId || this.post?.id);
      if (!postId) {
        this.shareFeedback = 'Unable to share this post right now.';
        return;
      }

      const note = this.truncateForMessage(this.shareMessage?.trim() || '', 1000);
      const selectedConnections = this.shareConnections.filter(connection => connection.selected);
      const requests = selectedConnections.map(connection => firstValueFrom(
        this.api.post(`/api/messages/send/${connection.id}`, {
          content: note,
          sharedPost: {
            postId,
            mediaUrl: this.activeMedia?.url || this.post?.mediaUrl || '',
            mediaType: this.activeMedia?.type || this.post?.mediaType || '',
            description: caption,
            authorUsername: author
          }
        })
      ));

      const results = await Promise.allSettled(requests);
      const successCount = results.filter(result => result.status === 'fulfilled').length;
      const failCount = results.length - successCount;

      this.shareCount += successCount;
      if (successCount > 0 && failCount === 0) {
        this.shareFeedback = `Post shared with ${successCount} connection${successCount > 1 ? 's' : ''}.`;
        setTimeout(() => this.closeShareModal(), 700);
      } else if (successCount > 0) {
        this.shareFeedback = `Shared with ${successCount} connection${successCount > 1 ? 's' : ''}. ${failCount} failed.`;
      } else {
        this.shareFeedback = 'Failed to share post.';
      }
    } catch (err: any) {
      console.error("Failed to share post", err);
      const apiMessage = typeof err?.error === 'string' ? err.error : '';
      this.shareFeedback = apiMessage || 'Failed to share post.';
    } finally {
      this.isSharing = false;
    }
  }

  private async trackPostView(payload?: { watchSeconds?: number; completed?: boolean }) {
    const postId = this.post?.postId || this.post?.id;
    if (!postId) return;

    if (!payload && this.trackedImpression) {
      return;
    }

    if (!payload) {
      this.trackedImpression = true;
    }

    try {
      await firstValueFrom(this.api.post(`/creator/analytics/track/post/${postId}`, payload || {}));
    } catch {
      // no-op: analytics should not impact UX
    }
  }

  private flushWatchProgress(completed: boolean) {
    if (!this.isVideoPost) {
      return;
    }

    const elapsed = this.playbackStartedAt ? (Date.now() - this.playbackStartedAt) / 1000 : 0;
    this.playbackStartedAt = null;

    if (elapsed <= 0 && !completed) {
      return;
    }

    this.trackPostView({
      watchSeconds: Number(elapsed.toFixed(2)),
      completed
    });
  }

  async openLikesModal() {
    const postId = this.post.postId || this.post.id;
    if (!postId) return;

    this.showLikesModal = true;
    this.loadingLikes = true;
    this.likesUsers = [];
    try {
      const users = await firstValueFrom(this.api.get<any[]>(`/likes/${postId}/users`));
      this.likesUsers = (users || []).map(user => ({
        id: Number(user?.id) || 0,
        username: (user?.username || '').toString(),
        avatarUrl: (user?.avatarUrl || '').toString()
      }));
    } catch (err) {
      console.error('Failed to load liked users', err);
      this.likesUsers = [];
    } finally {
      this.loadingLikes = false;
    }
  }

  closeLikesModal() {
    this.showLikesModal = false;
    this.likesSheetOffset = 0;
    this.isSheetDragging = false;
  }

  openCommentsModal() {
    this.showCommentsModal = true;
    this.showComments = true;
  }

  closeCommentsModal() {
    this.showCommentsModal = false;
    this.commentsSheetOffset = 0;
    this.isSheetDragging = false;
  }

  onSheetTouchStart(type: 'likes' | 'comments', event: TouchEvent) {
    const touch = event.touches?.[0];
    if (!touch) {
      return;
    }
    this.sheetDragStartY = touch.clientY;
    this.sheetDragType = type;
    this.isSheetDragging = true;
  }

  onSheetTouchMove(type: 'likes' | 'comments', event: TouchEvent) {
    if (this.sheetDragStartY === null || this.sheetDragType !== type) {
      return;
    }
    const touch = event.touches?.[0];
    if (!touch) {
      return;
    }
    const delta = Math.max(0, touch.clientY - this.sheetDragStartY);
    if (type === 'likes') {
      this.likesSheetOffset = delta;
    } else {
      this.commentsSheetOffset = delta;
    }
  }

  onSheetTouchEnd(type: 'likes' | 'comments', event: TouchEvent) {
    if (this.sheetDragStartY === null || this.sheetDragType !== type) {
      return;
    }
    const target = event.currentTarget as HTMLElement | null;
    const height = target?.clientHeight || 0;
    const offset = type === 'likes' ? this.likesSheetOffset : this.commentsSheetOffset;
    const threshold = Math.min(160, Math.max(120, height * 0.25));
    if (offset > threshold) {
      if (type === 'likes') {
        this.closeLikesModal();
      } else {
        this.closeCommentsModal();
      }
    } else {
      if (type === 'likes') {
        this.likesSheetOffset = 0;
      } else {
        this.commentsSheetOffset = 0;
      }
    }
    this.sheetDragStartY = null;
    this.sheetDragType = null;
    this.isSheetDragging = false;
  }

  getSheetTransform(type: 'likes' | 'comments'): string {
    const offset = type === 'likes' ? this.likesSheetOffset : this.commentsSheetOffset;
    return `translateY(${offset}px)`;
  }

  getSheetTransition(type: 'likes' | 'comments'): string {
    if (this.isSheetDragging && this.sheetDragType === type) {
      return 'none';
    }
    return 'transform 0.22s ease';
  }

  async goToAuthorProfile(event: Event) {
    event.stopPropagation();
    const username = (this.post?.authorUsername || this.post?.userName || '').toString().trim();
    if (!username) {
      return;
    }
    await this.router.navigate(['/profile', username]);
  }
}
