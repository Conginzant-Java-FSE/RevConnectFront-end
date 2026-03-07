import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { PostService } from '../../services/post.service';

@Component({
  selector: 'app-creator-studio',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './creator-studio.component.html',
  styleUrl: './creator-studio.component.css'
})
export class CreatorStudioComponent implements OnInit {
  authService = inject(AuthService);
  private postService = inject(PostService);

  loading = true;
  error = '';
  pendingCollabs: any[] = [];

  get isCreator(): boolean {
    return this.authService.currentUser?.role === 'CREATER';
  }

  async ngOnInit() {
    if (!this.isCreator) {
      this.loading = false;
      this.error = 'Creator Studio is available only for creator accounts.';
      return;
    }
    await this.loadStudio();
  }

  async loadStudio() {
    this.loading = true;
    this.error = '';
    try {
      const pending = await firstValueFrom(this.postService.getPendingCollabPosts());

      this.pendingCollabs = pending || [];
    } catch (err) {
      console.error('Failed to load creator studio data', err);
      this.error = 'Unable to load creator studio right now.';
    } finally {
      this.loading = false;
    }
  }

  async accept(postId: number) {
    if (!postId) return;
    await firstValueFrom(this.postService.acceptCollabPost(postId));
    this.pendingCollabs = this.pendingCollabs.filter(item => Number(item.postId) !== Number(postId));
  }

  async reject(postId: number) {
    if (!postId) return;
    await firstValueFrom(this.postService.rejectCollabPost(postId));
    this.pendingCollabs = this.pendingCollabs.filter(item => Number(item.postId) !== Number(postId));
  }
}
