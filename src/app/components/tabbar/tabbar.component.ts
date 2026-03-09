import { Component, EventEmitter, OnDestroy, OnInit, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ActivityBadgeService } from '../../services/activity-badge.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-tabbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './tabbar.component.html',
  styleUrl: './tabbar.component.css'
})
export class TabbarComponent implements OnInit, OnDestroy {
  authService = inject(AuthService);
  activityBadgeService = inject(ActivityBadgeService);

  @Output() onOpenCreateModal = new EventEmitter<void>();
  notificationUnreadCount = 0;
  messageUnreadCount = 0;
  private refreshTimer: any = null;
  private subscriptions: Subscription[] = [];

  get user() {
    return this.authService.currentUser;
  }

  ngOnInit(): void {
    this.subscriptions.push(
      this.activityBadgeService.notificationUnreadCount$.subscribe(count => {
        this.notificationUnreadCount = Number(count) || 0;
      })
    );
    this.subscriptions.push(
      this.activityBadgeService.messageUnreadCount$.subscribe(count => {
        this.messageUnreadCount = Number(count) || 0;
      })
    );
    this.activityBadgeService.refreshAll();
    this.refreshTimer = setInterval(() => this.activityBadgeService.refreshAll(), 15000);
  }

  ngOnDestroy(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.subscriptions = [];
  }

  get unreadCount() {
    return this.notificationUnreadCount;
  }

  get isCreator() {
    return this.user?.role === 'CREATER';
  }

  get isBusiness() {
    return this.user?.role === 'Business_Account_User';
  }

  get profileRoute(): any[] {
    const username = this.user?.username;
    return username ? ['/profile', username] : ['/profile'];
  }
}
