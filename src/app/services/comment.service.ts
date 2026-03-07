import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { CommentRequestDTO, CommentResponseDTO } from '../models/comment.model';

@Injectable({ providedIn: 'root' })
export class CommentService {
  private api = inject(ApiService);

  addComment(postId: number, comment: CommentRequestDTO): Observable<CommentResponseDTO> {
    return this.api.post<CommentResponseDTO>(`/comments/${postId}`, comment);
  }

  getCommentsByPost(postId: number): Observable<CommentResponseDTO[]> {
    return this.api.get<CommentResponseDTO[]>(`/comments/post/${postId}`);
  }

  deleteComment(commentId: number): Observable<string> {
    return this.api.delete<string>(`/comments/${commentId}`);
  }
}
