import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { PostService } from '../../services/post.service';

@Component({
  selector: 'app-saved',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './saved.component.html',
  styleUrl: './saved.component.css'
})
export class SavedComponent implements OnInit {
  private postService = inject(PostService);

  loading = true;
  error = '';
  savedPosts: any[] = [];

  async ngOnInit() {
    await this.loadSavedPosts();
  }

  async loadSavedPosts() {
    this.loading = true;
    this.error = '';
    try {
      const response = await firstValueFrom(this.postService.getSavedPosts());
      this.savedPosts = (response || []).map(item => ({
        ...item,
        post: item?.post || {}
      }));
    } catch (err) {
      console.error('Failed to fetch saved posts', err);
      this.error = 'Unable to load saved posts right now.';
    } finally {
      this.loading = false;
    }
  }

  async unsave(postId: number) {
    if (!postId) {
      return;
    }
    try {
      await firstValueFrom(this.postService.unsavePost(postId));
      this.savedPosts = this.savedPosts.filter(item => Number(item?.post?.id) !== Number(postId));
      this.error = '';
      alert('Post removed from saved posts.');
    } catch (err) {
      console.error('Failed to unsave post', err);
      this.error = 'Unable to remove saved post.';
    }
  }

  isVideo(post: any): boolean {
    const mediaType = (post?.mediaType || '').toString().toUpperCase();
    if (mediaType === 'VIDEO') return true;
    const url = (post?.mediaUrl || '').toString().toLowerCase().split('?')[0];
    return ['.mp4', '.webm', '.ogg', '.mov', '.m4v'].some(ext => url.endsWith(ext));
  }
}
