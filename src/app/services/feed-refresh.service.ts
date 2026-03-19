import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export type FeedRefreshType = 'post' | 'story';

@Injectable({ providedIn: 'root' })
export class FeedRefreshService {
  private readonly refreshSubject = new Subject<FeedRefreshType>();
  readonly refresh$ = this.refreshSubject.asObservable();

  notify(type: FeedRefreshType) {
    this.refreshSubject.next(type);
  }
}
