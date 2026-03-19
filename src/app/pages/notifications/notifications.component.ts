import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { firstValueFrom } from 'rxjs';
import { ActivityBadgeService } from '../../services/activity-badge.service';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './notifications.component.html',
  styleUrl: './notifications.component.css'
})
export class NotificationsComponent implements OnInit {
  notifications: any[] = [];
  loading = true;

  api = inject(ApiService);
  router = inject(Router);
  activityBadgeService = inject(ActivityBadgeService);

  ngOnInit() {
    this.fetchNotifications();
  }

  async fetchNotifications() {
    this.loading = true;
    try {
      const res = await firstValueFrom(this.api.get<any[]>('/notifications'));
      this.notifications = res || [];
      this.activityBadgeService.refreshNotifications();
    } catch (err) {
      console.error("Failed to load notifications", err);
    } finally {
      this.loading = false;
    }
  }

  async handleMarkAsRead(id: number, isRead: boolean) {
    if (isRead) return;
    try {
      await firstValueFrom(this.api.put(`/notifications/${id}/read`, {}, { responseType: 'text' as 'json' }));
      this.notifications = this.notifications.map(n => n.id === id ? { ...n, read: true } : n);
      this.activityBadgeService.refreshNotifications();
    } catch (err) {
      console.error(err);
    }
  }

  async handleMarkAllRead() {
    try {
      await firstValueFrom(this.api.put('/notifications/read-all', {}, { responseType: 'text' as 'json' }));
      this.notifications = this.notifications.map(n => ({ ...n, read: true }));
      this.activityBadgeService.refreshNotifications();
    } catch (err) {
      console.error(err);
    }
  }

  async handleAcceptRequest(event: Event, requestId: number, notifId: number) {
    event.stopPropagation();
    try {
      await firstValueFrom(this.api.put(`/follow/accept/${requestId}`, {}, { responseType: 'text' as 'json' }));
      this.notifications = this.notifications.map(n =>
        n.id === notifId ? { ...n, type: 'FOLLOW_ACCEPTED', read: true } : n
      );
      this.activityBadgeService.refreshNotifications();
    } catch (err) {
      console.error("Failed to accept request", err);
    }
  }

  async handleRejectRequest(event: Event, requestId: number, notifId: number) {
    event.stopPropagation();
    try {
      await firstValueFrom(this.api.put(`/follow/reject/${requestId}`, {}, { responseType: 'text' as 'json' }));
      this.notifications = this.notifications.filter(n => n.id !== notifId);
      this.activityBadgeService.refreshNotifications();
    } catch (err) {
      console.error("Failed to reject request", err);
    }
  }

  getMessage(type: string): string {
    switch (type) {
      case 'LIKE': return 'liked your post.';
      case 'COMMENT': return 'commented on your post.';
      case 'POST_MENTION': return 'mentioned you in a post.';
      case 'COMMENT_MENTION': return 'mentioned you in a comment.';
      case 'MESSAGE': return 'sent you a message.';
      case 'FOLLOW_REQUEST': return 'wants to connect with you.';
      case 'FOLLOW_ACCEPTED': return 'accepted your connect request.';
      case 'COLLAB_PROMOTION_REQUESTED': return 'sent promotion details for collaboration.';
      case 'COLLAB_PROMOTION_ACCEPTED': return 'accepted your promotion request.';
      case 'COLLAB_PROMOTION_CONFIRMED': return 'confirmed promotion completion.';
      case 'COLLAB_PROMOTION_POST_CREATED': return 'created a promotion post and tagged you.';
      case 'COLLAB_PAYMENT_DONE': return 'marked collaboration payment as completed.';
      case 'COLLAB_POST_REQUEST': return 'invited you to collaborate on a post.';
      case 'COLLAB_DIRECT_PROPOSAL_SENT': return 'sent you a direct collaboration request.';
      case 'COLLAB_APPLICATION_ACCEPTED': return 'accepted your collaboration application.';
      case 'COLLAB_APPLICATION_REJECTED': return 'rejected your collaboration application.';
      case 'COLLAB_OPEN_OPPORTUNITY': return 'posted a new open promotion opportunity.';
      case 'COLLAB_DIRECT_PROPOSAL_ACCEPTED': return 'accepted your direct collaboration request.';
      case 'COLLAB_DIRECT_PROPOSAL_REJECTED': return 'rejected your direct collaboration request.';
      case 'FOLLOW': return 'started following you.';
      default: return 'interacted with you.';
    }
  }

  formatTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;

    const diffInWeeks = Math.floor(diffInDays / 7);
    return `${diffInWeeks}w ago`;
  }

  goToProfile(event: Event, username: string) {
    event.stopPropagation();
    this.router.navigate(['/profile', username]);
  }

  get unreadCount(): number {
    return this.notifications.filter(n => !n.read).length;
  }
}
