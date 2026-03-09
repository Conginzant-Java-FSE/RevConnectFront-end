import { Injectable, inject } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { firstValueFrom } from 'rxjs';
import { NotificationService } from './notification.service';
import { MessageService } from './message.service';

@Injectable({ providedIn: 'root' })
export class ActivityBadgeService {
  private notificationService = inject(NotificationService);
  private messageService = inject(MessageService);

  private notificationUnreadCountSubject = new BehaviorSubject<number>(0);
  private messageUnreadCountSubject = new BehaviorSubject<number>(0);

  notificationUnreadCount$ = this.notificationUnreadCountSubject.asObservable();
  messageUnreadCount$ = this.messageUnreadCountSubject.asObservable();

  async refreshAll(): Promise<void> {
    try {
      const [notificationCount, messageCount] = await Promise.all([
        firstValueFrom(this.notificationService.getUnreadCount()),
        firstValueFrom(this.messageService.getUnreadCount())
      ]);
      this.notificationUnreadCountSubject.next(Number(notificationCount) || 0);
      this.messageUnreadCountSubject.next(Number(messageCount) || 0);
    } catch {
      // keep current values on refresh failures
    }
  }

  async refreshNotifications(): Promise<void> {
    try {
      const count = await firstValueFrom(this.notificationService.getUnreadCount());
      this.notificationUnreadCountSubject.next(Number(count) || 0);
    } catch {
      // keep current value on refresh failures
    }
  }

  async refreshMessages(): Promise<void> {
    try {
      const count = await firstValueFrom(this.messageService.getUnreadCount());
      this.messageUnreadCountSubject.next(Number(count) || 0);
    } catch {
      // keep current value on refresh failures
    }
  }
}
