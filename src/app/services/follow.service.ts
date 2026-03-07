import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { FollowerResponseDTO, FollowingResponseDTO, FollowRequest } from '../models/following.model';

@Injectable({ providedIn: 'root' })
export class FollowService {
  private api = inject(ApiService);

  // ── Following ──
  followUser(followId: number): Observable<string> {
    return this.api.post<string>(`/revconnect/users/following/${followId}`);
  }

  unfollowUser(followId: number): Observable<string> {
    return this.api.delete<string>(`/revconnect/users/following/${followId}`);
  }

  getFollowing(): Observable<FollowingResponseDTO[]> {
    return this.api.get<FollowingResponseDTO[]>('/revconnect/users/following');
  }

  getFollowingCount(): Observable<number> {
    return this.api.get<number>('/revconnect/users/following/count');
  }

  getFollowers(): Observable<FollowerResponseDTO[]> {
    return this.api.get<FollowerResponseDTO[]>('/revconnect/users/followers');
  }

  getFollowersCount(): Observable<number> {
    return this.api.get<number>('/revconnect/users/followers/count');
  }

  // ── Follow Requests ──
  sendFollowRequest(receiverId: number): Observable<any> {
    return this.api.post<any>(`/follow/request/${receiverId}`);
  }

  acceptFollowRequest(requestId: number): Observable<any> {
    return this.api.put<any>(`/follow/accept/${requestId}`);
  }

  rejectFollowRequest(requestId: number): Observable<any> {
    return this.api.put<any>(`/follow/reject/${requestId}`);
  }

  getPendingRequests(): Observable<FollowRequest[]> {
    return this.api.get<FollowRequest[]>('/follow/requests/pending');
  }

  getSentPendingRequests(): Observable<FollowRequest[]> {
    return this.api.get<FollowRequest[]>('/follow/requests/sent');
  }
}
