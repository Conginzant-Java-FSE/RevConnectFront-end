import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export type CreateSubMode = 'POST' | 'STORY';

@Injectable({ providedIn: 'root' })
export class CreateModalService {
  private readonly openRequestsSubject = new Subject<CreateSubMode>();
  readonly openRequests$ = this.openRequestsSubject.asObservable();

  openCreateModal(mode: CreateSubMode = 'POST') {
    this.openRequestsSubject.next(mode);
  }
}
