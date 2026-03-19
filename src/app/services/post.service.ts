import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { PostResponseDTO, CreatePostRequest } from '../models/post.model';

@Injectable({ providedIn: 'root' })
export class PostService {
  private api = inject(ApiService);

  // ── CRUD ──
  createPost(post: CreatePostRequest): Observable<PostResponseDTO> {
    return this.api.post<PostResponseDTO>('/revconnect/users/addPost', post);
  }

  getMyPosts(): Observable<PostResponseDTO[]> {
    return this.api.get<PostResponseDTO[]>('/revconnect/users/getAllposts');
  }

  getPostsByUsername(username: string): Observable<PostResponseDTO[]> {
    return this.api.get<PostResponseDTO[]>(`/revconnect/users/posts/user/${username}`);
  }

  updatePost(postId: number, post: CreatePostRequest): Observable<PostResponseDTO> {
    return this.api.put<PostResponseDTO>(`/revconnect/users/posts/${postId}`, post);
  }

  deletePost(postId: number): Observable<PostResponseDTO> {
    return this.api.delete<PostResponseDTO>(`/revconnect/users/posts/${postId}`);
  }

  deleteAllPosts(): Observable<PostResponseDTO[]> {
    return this.api.delete<PostResponseDTO[]>('/revconnect/users/posts/deleteAll');
  }

  getPendingCollabPosts(): Observable<PostResponseDTO[]> {
    return this.api.get<PostResponseDTO[]>('/revconnect/users/posts/collab/pending');
  }

  acceptCollabPost(postId: number): Observable<PostResponseDTO> {
    return this.api.put<PostResponseDTO>(`/revconnect/users/posts/${postId}/collab/accept`, {});
  }

  rejectCollabPost(postId: number): Observable<PostResponseDTO> {
    return this.api.put<PostResponseDTO>(`/revconnect/users/posts/${postId}/collab/reject`, {});
  }

  getMyVideoSeries(): Observable<Record<string, PostResponseDTO[]>> {
    return this.api.get<Record<string, PostResponseDTO[]>>('/revconnect/users/posts/series/me');
  }

  // ── Feed ──
  getHomeFeed(): Observable<PostResponseDTO[]> {
    return this.api.get<PostResponseDTO[]>('/feed/home');
  }

  getExploreFeed(): Observable<PostResponseDTO[]> {
    return this.api.get<PostResponseDTO[]>('/feed/explore');
  }

  // ── Likes ──
  toggleLike(postId: number): Observable<string> {
    return this.api.post<string>(`/likes/${postId}`);
  }

  getLikeCount(postId: number): Observable<number> {
    return this.api.get<number>(`/likes/${postId}/count`);
  }

  isLiked(postId: number): Observable<boolean> {
    return this.api.get<boolean>(`/likes/${postId}/status`);
  }

  // ── Saved Posts ──
  savePost(postId: number): Observable<string> {
    return this.api.post<string>(`/saved/${postId}`, {}, { responseType: 'text' as 'json' });
  }

  unsavePost(postId: number): Observable<string> {
    return this.api.delete<string>(`/saved/${postId}`, { responseType: 'text' as 'json' });
  }

  getSavedPosts(): Observable<any[]> {
    return this.api.get<any[]>('/saved');
  }
}
