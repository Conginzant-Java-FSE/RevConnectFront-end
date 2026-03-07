import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Notification } from '../models/notification.model';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private api = inject(ApiService);

  getAllNotifications(): Observable<Notification[]> {
    return this.api.get<Notification[]>('/notifications');
  }

  getUnreadNotifications(): Observable<Notification[]> {
    return this.api.get<Notification[]>('/notifications/unread');
  }

  getUnreadCount(): Observable<number> {
    return this.api.get<number>('/notifications/unread/count');
  }

  markAsRead(id: number): Observable<string> {
    return this.api.put<string>(`/notifications/${id}/read`);
  }

  markAllAsRead(): Observable<string> {
    return this.api.put<string>('/notifications/read-all');
  }
}
