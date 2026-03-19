import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Story } from '../models/story.model';

@Injectable({ providedIn: 'root' })
export class StoryService {
  private api = inject(ApiService);

  createStory(story: Partial<Story>): Observable<Story> {
    return this.api.post<Story>('/stories', story);
  }

  getMyStories(): Observable<Story[]> {
    return this.api.get<Story[]>('/stories/me');
  }

  getFeedStories(): Observable<Story[]> {
    return this.api.get<Story[]>('/stories/feed');
  }

  deleteStory(id: number): Observable<string> {
    return this.api.delete<string>(`/stories/${id}`, { responseType: 'text' as 'json' });
  }
}
