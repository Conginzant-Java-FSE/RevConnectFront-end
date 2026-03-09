import { Component, EventEmitter, OnDestroy, OnInit, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Subscription } from 'rxjs';
import { ActivityBadgeService } from '../../services/activity-badge.service';

@Component({
  selector: 'app-mobile-topbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './mobile-topbar.component.html',
  styleUrl: './mobile-topbar.component.css'
})
export class MobileTopbarComponent implements OnInit, OnDestroy {
  activityBadgeService = inject(ActivityBadgeService);

  @Output() onOpenCreateModal = new EventEmitter<void>();
  unreadCount = 0;
  private refreshTimer: any = null;
  private subscription?: Subscription;

  ngOnInit(): void {
    this.subscription = this.activityBadgeService.notificationUnreadCount$.subscribe(count => {
      this.unreadCount = Number(count) || 0;
    });
    this.activityBadgeService.refreshNotifications();
    this.refreshTimer = setInterval(() => this.activityBadgeService.refreshNotifications(), 15000);
  }

  ngOnDestroy(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
    this.subscription?.unsubscribe();
    this.subscription = undefined;
  }
}
