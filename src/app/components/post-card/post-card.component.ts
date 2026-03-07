import { AfterViewInit, Component, ElementRef, HostListener, Input, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-post-card',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './post-card.component.html',
  styleUrl: './post-card.component.css'
})
export class PostCardComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() post: any;
  @ViewChild('postVideo') postVideo?: ElementRef<HTMLVideoElement>;

  api = inject(ApiService);
  authService = inject(AuthService);

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
  showPostOptionsMenu = false;
  isEditingPost = false;
  editPostContent = '';
  isUpdatingPost = false;
  isDeletingPost = false;
  postActionError = '';
  isPostRemoved = false;
  showShareModal = false;
  shareConnections: Array<{ id: number; username: string; selected: boolean }> = [];
  shareMessage = '';
  isSharing = false;
  shareFeedback = '';
  private videoObserver?: IntersectionObserver;
  private trackedImpression = false;
  private playbackStartedAt: number | null = null;

  get currentUser() {
    return this.authService.currentUser;
  }

  get canManagePost(): boolean {
    const ownerId = Number(this.post?.userId || this.post?.user?.id);
    const loggedInId = Number(this.currentUser?.id);
    return !!ownerId && !!loggedInId && ownerId === loggedInId;
  }

  ngOnInit() {
    if (this.post) {
      this.likeCount = this.post.likeCount || 0;
      this.saveCount = this.post.saveCount || 0;
      this.shareCount = this.post.shareCount || 0;
      this.fetchInteractions();
      this.trackPostView();
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
    const mediaType = (this.post?.mediaType || '').toString().toUpperCase();
    if (mediaType === 'VIDEO') {
      return true;
    }
    return this.isVideoUrl(this.post?.mediaUrl);
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
      await firstValueFrom(this.api.delete(`/revconnect/users/posts/${postId}`));
      this.isPostRemoved = true;
    } catch (err) {
      console.error('Failed to delete post', err);
      this.postActionError = 'Failed to delete post.';
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
    await this.loadShareConnections();
  }

  closeShareModal() {
    this.showShareModal = false;
    this.shareFeedback = '';
    this.shareConnections = [];
    this.shareMessage = '';
  }

  get selectedShareCount(): number {
    return this.shareConnections.filter(connection => connection.selected).length;
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
            mediaUrl: this.post?.mediaUrl || '',
            mediaType: this.post?.mediaType || '',
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
}
