import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { PostCardComponent } from '../../components/post-card/post-card.component';
import { CreateModalComponent } from '../../components/create-modal/create-modal.component';
import { firstValueFrom } from 'rxjs';
// import { StoryRingComponent } from '../../components/story-ring/story-ring.component';
// import { StoryModalComponent } from '../../components/story-modal/story-modal.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, PostCardComponent, CreateModalComponent /*, StoryRingComponent, StoryModalComponent*/],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit {
  posts: any[] = [];
  stories: any[] = [];
  storyUsers: any[] = [];
  loading = true;
  error = '';

  authService = inject(AuthService);
  api = inject(ApiService);

  isStoryModalOpen = false;
  storyModalMode: 'create' | 'view' = 'create';
  activeStoryView: any = null;
  storyCreateDefaultSubMode: 'POST' | 'STORY' = 'STORY';
  storyQueue: any[] = [];
  storyQueueIndex = -1;
  storyUserQueue: any[] = [];
  storyUserIndex = -1;
  private seenStoryIds = new Set<number>();

  get user() {
    return this.authService.currentUser;
  }

  async ngOnInit() {
    this.loadSeenStories();
    await this.fetchFeedData();
  }

  async fetchFeedData() {
    this.loading = true;
    try {
      // Fetch Stories
      const storiesProm = firstValueFrom(this.api.get<any[]>('/stories/feed'));

      // Fetch Home Feed Posts
      const feedProm = firstValueFrom(this.api.get<any[]>('/feed/home'));

      const [storiesRes, feedRes] = await Promise.all([storiesProm, feedProm]);

      this.stories = storiesRes || [];
      this.buildStoryUsers();

      this.posts = (feedRes || []).map(dto => ({
        ...dto,
        authorUsername: dto.userName,
        content: dto.description,
        createdAt: dto.createdAt || new Date(),
        mediaType: dto.mediaType || '',
        likeCount: dto.likeCount || 0,
        commentCount: dto.commentCount || 0
      }));
    } catch (err) {
      console.error("Error fetching feed:", err);
      this.error = "Failed to load feed. Please try again later.";
    } finally {
      this.loading = false;
    }
  }

  async fetchStoriesOnly() {
    try {
      const storiesRes = await firstValueFrom(this.api.get<any[]>('/stories/feed'));
      this.stories = storiesRes || [];
      this.buildStoryUsers();
    } catch (err) {
      console.error("Failed to refresh stories", err);
    }
  }

  handleOpenStoryCreate() {
    this.storyModalMode = 'create';
    this.storyCreateDefaultSubMode = 'STORY';
    this.activeStoryView = null;
    this.storyQueue = [];
    this.storyQueueIndex = -1;
    this.storyUserQueue = [];
    this.storyUserIndex = -1;
    this.isStoryModalOpen = true;
  }

  handleOpenStoryView(userStoryBucket: any) {
    this.storyUserQueue = Array.isArray(this.storyUsers) ? [...this.storyUsers] : [];
    const targetKey = `${userStoryBucket?.userId || userStoryBucket?.username || userStoryBucket?.id}`;
    const selectedIndex = this.storyUserQueue.findIndex(bucket =>
      `${bucket?.userId || bucket?.username || bucket?.id}` === targetKey
    );
    this.storyUserIndex = selectedIndex >= 0 ? selectedIndex : 0;
    if (!this.openStoryBucketAt(this.storyUserIndex, true)) {
      return;
    }

    this.storyModalMode = 'view';
    this.isStoryModalOpen = true;
    this.buildStoryUsers();
  }

  handleStoryModalClose() {
    this.isStoryModalOpen = false;
    this.activeStoryView = null;
    this.storyQueue = [];
    this.storyQueueIndex = -1;
    this.storyUserQueue = [];
    this.storyUserIndex = -1;
  }

  handleStoryAdvance() {
    if (this.storyModalMode !== 'view') {
      return;
    }

    const nextIndex = this.storyQueueIndex + 1;
    if (nextIndex >= this.storyQueue.length) {
      if (!this.advanceToNextUserStory()) {
        this.handleStoryModalClose();
      }
      return;
    }

    this.storyQueueIndex = nextIndex;
    this.activeStoryView = this.storyQueue[this.storyQueueIndex];
    this.markStorySeen(this.activeStoryView);
    this.buildStoryUsers();
  }

  handleStoryBack() {
    if (this.storyModalMode !== 'view') {
      return;
    }

    const prevIndex = this.storyQueueIndex - 1;
    if (prevIndex < 0) {
      this.advanceToPreviousUserStory();
      return;
    }

    this.storyQueueIndex = prevIndex;
    this.activeStoryView = this.storyQueue[this.storyQueueIndex];
  }

  private openStoryBucketAt(index: number, preferFirstUnseen: boolean): boolean {
    const bucket = this.storyUserQueue[index];
    const userStories = Array.isArray(bucket?.stories) ? bucket.stories : [];
    if (userStories.length === 0) {
      return false;
    }

    this.storyQueue = [...userStories].sort(
      (a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
    );

    let startIndex = 0;
    if (preferFirstUnseen) {
      const firstUnseenIndex = this.storyQueue.findIndex(story => !this.seenStoryIds.has(Number(story.id)));
      startIndex = firstUnseenIndex >= 0 ? firstUnseenIndex : 0;
    }

    this.storyQueueIndex = startIndex;
    this.activeStoryView = this.storyQueue[this.storyQueueIndex];
    this.markStorySeen(this.activeStoryView);
    return true;
  }

  private advanceToNextUserStory(): boolean {
    if (!this.storyUserQueue.length) {
      return false;
    }
    for (let i = this.storyUserIndex + 1; i < this.storyUserQueue.length; i++) {
      if (this.openStoryBucketAt(i, true)) {
        this.storyUserIndex = i;
        this.buildStoryUsers();
        return true;
      }
    }
    return false;
  }

  private advanceToPreviousUserStory(): boolean {
    if (!this.storyUserQueue.length) {
      return false;
    }
    for (let i = this.storyUserIndex - 1; i >= 0; i--) {
      if (this.openStoryBucketAt(i, false)) {
        this.storyUserIndex = i;
        this.storyQueueIndex = Math.max(0, this.storyQueue.length - 1);
        this.activeStoryView = this.storyQueue[this.storyQueueIndex];
        return true;
      }
    }
    return false;
  }

  private buildStoryUsers() {
    const byUser = new Map<string, any>();

    for (const story of this.stories) {
      const key = `${story.userId || story.username || story.id}`;
      if (!byUser.has(key)) {
        byUser.set(key, {
          userId: story.userId,
          username: story.username || 'story',
          userProfilePic: story.userProfilePic,
          stories: []
        });
      }
      byUser.get(key).stories.push(story);
    }

    this.storyUsers = Array.from(byUser.values())
      .map(bucket => {
        const latestStory = [...bucket.stories].sort(
          (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        )[0];
        const isSeen = bucket.stories.every((story: any) => this.seenStoryIds.has(Number(story.id)));
        return {
          ...bucket,
          latestStory,
          isSeen
        };
      })
      .sort(
        (a, b) =>
          new Date(b.latestStory?.createdAt || 0).getTime() - new Date(a.latestStory?.createdAt || 0).getTime()
      );
  }

  private loadSeenStories() {
    try {
      const raw = localStorage.getItem('revconnect_seen_story_ids');
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        parsed.forEach(id => {
          const num = Number(id);
          if (Number.isFinite(num) && num > 0) {
            this.seenStoryIds.add(num);
          }
        });
      }
    } catch {
      // ignore malformed local storage
    }
  }

  private saveSeenStories() {
    const latest = Array.from(this.seenStoryIds).slice(-500);
    localStorage.setItem('revconnect_seen_story_ids', JSON.stringify(latest));
  }

  private markStorySeen(story: any) {
    const id = Number(story?.id);
    if (!Number.isFinite(id) || id <= 0) {
      return;
    }
    this.seenStoryIds.add(id);
    this.saveSeenStories();
  }
}
