import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, QueryList, ViewChildren, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { firstValueFrom } from 'rxjs';
import { Subscription } from 'rxjs';
import { PostCardComponent } from '../../components/post-card/post-card.component';

@Component({
    selector: 'app-explore',
    standalone: true,
    imports: [CommonModule, PostCardComponent],
    templateUrl: './explore.component.html',
    styleUrl: './explore.component.css'
})
export class ExploreComponent implements OnInit, AfterViewInit, OnDestroy {
    @ViewChildren('exploreVideo') exploreVideos!: QueryList<ElementRef<HTMLVideoElement>>;

    posts: any[] = [];
    loading = true;
    error = '';
    selectedPost: any = null;
    showPostModal = false;
    private videoObserver?: IntersectionObserver;
    private videosChangeSub?: Subscription;

    api = inject(ApiService);

    async ngOnInit() {
        await this.fetchExploreFeed();
    }

    ngAfterViewInit() {
        this.videosChangeSub = this.exploreVideos.changes.subscribe(() => this.setupVideoObserver());
        this.setupVideoObserver();
    }

    ngOnDestroy() {
        this.videosChangeSub?.unsubscribe();
        this.teardownVideoObserver();
        document.body.style.overflow = '';
    }

    async fetchExploreFeed() {
        try {
            const res = await firstValueFrom(this.api.get<any[]>('/feed/explore'));

            this.posts = (res || [])
                .filter(dto => !!dto.mediaUrl)
                .map(dto => ({
                ...dto,
                authorUsername: dto.userName,
                content: dto.description,
                createdAt: dto.createdAt || new Date(),
                mediaType: dto.mediaType || '',
                likeCount: dto.likeCount || 0,
                commentCount: dto.commentCount || 0
                }));
        } catch (err) {
            console.error("Error fetching explore feed:", err);
            this.error = "Failed to load explore feed.";
        } finally {
            this.loading = false;
            setTimeout(() => this.setupVideoObserver());
        }
    }

    trackByPost(index: number, post: any): string {
        return `${post.postId || post.id || index}`;
    }

    isVideoPost(post: any): boolean {
        const mediaType = (post?.mediaType || '').toString().toUpperCase();
        if (mediaType === 'VIDEO') {
            return true;
        }

        const url = (post?.mediaUrl || '').toString();
        if (!url) {
            return false;
        }

        if (url.startsWith('data:video/')) {
            return true;
        }

        const normalizedUrl = url.split('?')[0].toLowerCase();
        return ['.mp4', '.webm', '.ogg', '.mov', '.m4v'].some(ext => normalizedUrl.endsWith(ext));
    }

    openPost(post: any) {
        if (!post) {
            return;
        }
        this.selectedPost = post;
        this.showPostModal = true;
        document.body.style.overflow = 'hidden';
    }

    closePostModal() {
        this.showPostModal = false;
        this.selectedPost = null;
        document.body.style.overflow = '';
    }

    private setupVideoObserver() {
        this.teardownVideoObserver();

        if (!this.exploreVideos || this.exploreVideos.length === 0) {
            return;
        }

        this.videoObserver = new IntersectionObserver(
            entries => {
                for (const entry of entries) {
                    const videoEl = entry.target as HTMLVideoElement;
                    if (entry.isIntersecting && entry.intersectionRatio >= 0.55) {
                        const playPromise = videoEl.play();
                        if (playPromise) {
                            playPromise.catch(() => {
                                // Ignore autoplay blocks; retries happen on next intersection event.
                            });
                        }
                    } else {
                        videoEl.pause();
                    }
                }
            },
            { threshold: [0, 0.25, 0.55, 0.85] }
        );

        this.exploreVideos.forEach(videoRef => {
            const video = videoRef.nativeElement;
            video.muted = true;
            video.playsInline = true;
            video.loop = true;
            this.videoObserver?.observe(video);
        });
    }

    private teardownVideoObserver() {
        if (this.videoObserver) {
            this.videoObserver.disconnect();
            this.videoObserver = undefined;
        }
    }
}
