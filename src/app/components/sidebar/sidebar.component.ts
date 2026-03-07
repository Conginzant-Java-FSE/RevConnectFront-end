import { Component, EventEmitter, OnDestroy, OnInit, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';
import { MessageService } from '../../services/message.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent implements OnInit, OnDestroy {
  authService = inject(AuthService);
  notificationService = inject(NotificationService);
  messageService = inject(MessageService);

  @Output() onOpenCreateModal = new EventEmitter<void>();
  notificationUnreadCount = 0;
  messageUnreadCount = 0;
  private refreshTimer: any = null;

  get user() {
    return this.authService.currentUser;
  }

  ngOnInit(): void {
    this.refreshUnreadCounts();
    this.refreshTimer = setInterval(() => this.refreshUnreadCounts(), 15000);
  }

  ngOnDestroy(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  get unreadCount() {
    return this.notificationUnreadCount;
  }

  async refreshUnreadCounts() {
    try {
      const [notificationCount, messageCount] = await Promise.all([
        firstValueFrom(this.notificationService.getUnreadCount()),
        firstValueFrom(this.messageService.getUnreadCount())
      ]);
      this.notificationUnreadCount = Number(notificationCount) || 0;
      this.messageUnreadCount = Number(messageCount) || 0;
    } catch {
      // keep existing badge values
    }
  }

  get isCreator() {
    return this.user?.role === 'CREATER';
  }

  get isBusiness() {
    return this.user?.role === 'Business_Account_User';
  }

  get canOpenStudio() {
    return this.isCreator;
  }

  get canOpenMarketplace() {
    return this.isCreator || this.isBusiness;
  }

  get profileRoute(): any[] {
    const username = this.user?.username;
    return username ? ['/profile', username] : ['/profile'];
  }
}
