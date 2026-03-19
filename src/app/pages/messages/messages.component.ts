import { Component, OnInit, OnDestroy, ViewChild, ElementRef, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { ActivityBadgeService } from '../../services/activity-badge.service';
import { firstValueFrom } from 'rxjs';
import { MessageResponseDTO } from '../../models/message.model';

@Component({
  selector: 'app-messages',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './messages.component.html',
  styleUrl: './messages.component.css'
})
export class MessagesComponent implements OnInit, OnDestroy {
  authService = inject(AuthService);
  api = inject(ApiService);
  router = inject(Router);
  activityBadgeService = inject(ActivityBadgeService);

  partners: any[] = [];
  searchResults: any[] = [];
  searchQuery = '';

  activeContact: any = null;
  conversation: MessageResponseDTO[] = [];
  newMessage = '';
  loading = false;
  editingMsgId: number | null = null;
  editContent = '';
  isMobileView = false;
  showConversationOnMobile = false;
  activeInboxTab: 'PRIMARY' | 'REQUESTS' = 'PRIMARY';
  private followingIds = new Set<number>();
  private lastSenderByPartner = new Map<number, number>();
  private approvedRequestIds = new Set<number>();
  private declinedRequestIds = new Set<number>();

  private pollInterval: any;

  @ViewChild('messagesEnd') messagesEndRef!: ElementRef;

  get user() {
    return this.authService.currentUser;
  }

  ngOnInit() {
    this.updateViewportMode();
    this.loadRequestState();
    this.fetchPartners();
  }

  ngOnDestroy() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
  }

  async fetchPartners() {
    try {
      const [partnersRes, followingRes] = await Promise.all([
        firstValueFrom(this.api.get<any[]>('/api/messages/partners')),
        firstValueFrom(this.api.get<any[]>('/revconnect/users/following')).catch(() => [])
      ]);
      this.followingIds = new Set(
        (followingRes || []).map((entry: any) => Number(entry?.followingId)).filter((id: number) => Number.isFinite(id))
      );

      const partners = this.sortPartners(partnersRes || []);
      this.partners = partners;

      await Promise.all(
        partners.map(async partner => {
          const senderId = await this.fetchLastSenderId(partner.id);
          if (senderId) {
            this.lastSenderByPartner.set(Number(partner.id), Number(senderId));
          }
        })
      );
    } catch (err) {
      console.error("Failed to load partners", err);
    }
  }

  async handleSearch() {
    if (!this.searchQuery.trim()) {
      this.searchResults = [];
      return;
    }

    try {
      const res = await firstValueFrom(this.api.get<any[]>(`/auth/search?query=${this.searchQuery}`));
      // Filter out self
      this.searchResults = (res || []).filter(u => u.username !== this.user?.username);
    } catch (err) {
      console.error("Search failed", err);
    }
  }

  handleSelectContact(contact: any) {
    this.activeContact = contact;
    this.searchQuery = '';
    this.searchResults = [];
    if (this.isMobileView) {
      this.showConversationOnMobile = true;
    }

    // If they aren't in the partners list yet, temporarily add them to the top so UI updates
    if (!this.partners.find(p => p.id === contact.id)) {
      this.partners = this.sortPartners([{ ...contact, unreadCount: 0 }, ...this.partners]);
    }

    this.partners = this.sortPartners(
      this.partners.map(p => p.id === contact.id ? { ...p, unreadCount: 0 } : p)
    );

    // Start polling for this contact
    this.startPolling(contact.id);
  }

  goBackToContacts() {
    this.showConversationOnMobile = false;
  }

  goBackToMessageList() {
    this.activeContact = null;
    this.showConversationOnMobile = false;
  }

  startPolling(contactId: number) {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }

    this.fetchConversation(contactId, true);

    // Check window object exists just in case for SSR compat (even though SSR is off here)
    if (typeof window !== 'undefined') {
      this.pollInterval = setInterval(() => {
        this.fetchConversation(contactId, false);
        this.fetchPartners();
      }, 3000);
    }
  }

  async fetchConversation(userId: number, showLoader = true) {
    if (showLoader) this.loading = true;
    try {
      const res = await firstValueFrom(this.api.get<MessageResponseDTO[]>(`/api/messages/conversation/${userId}`));
      const newData = res || [];
      this.activityBadgeService.refreshMessages();

      const prevLast = this.conversation[this.conversation.length - 1];
      const newLast = newData[newData.length - 1];

      if (this.conversation.length !== newData.length || (prevLast && newLast && prevLast.id !== newLast.id)) {
        this.conversation = newData;
        this.scrollToBottom();
      }
    } catch (err) {
      console.error("Failed to fetch conversation", err);
    } finally {
      if (showLoader) this.loading = false;
    }
  }

  scrollToBottom() {
    setTimeout(() => {
      if (this.messagesEndRef && this.messagesEndRef.nativeElement) {
        this.messagesEndRef.nativeElement.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  }

  async handleSendMessage(event: Event) {
    event.preventDefault();
    if (!this.newMessage.trim() || !this.activeContact) return;

    const content = this.newMessage;
    this.newMessage = ''; // optimistic clear

    try {
      await firstValueFrom(this.api.post(`/api/messages/send/${this.activeContact.id}`, { content }));
      this.approveRequest(this.activeContact);
      // Instantly fetch the updated convo
      this.fetchConversation(this.activeContact.id, false);
      this.fetchPartners(); // bump partner to top if necessary
      this.activityBadgeService.refreshMessages();
    } catch (err) {
      console.error("Failed to send message", err);
      alert("Message failed to send.");
    }
  }

  async handleDeleteMessage(msgId: number) {
    if (!window.confirm("Delete this message?")) return;
    try {
      await firstValueFrom(this.api.delete(`/api/messages/${msgId}`));
      this.conversation = this.conversation.filter(m => m.id !== msgId);
    } catch (err) {
      console.error("Failed to delete message", err);
    }
  }

  startEdit(msg: any) {
    this.editingMsgId = msg.id;
    this.editContent = msg.content;
  }

  async handleEditMessage(msgId: number) {
    if (!this.editContent.trim()) return;
    try {
      const res = await firstValueFrom(this.api.put<any>(`/api/messages/${msgId}`, { content: this.editContent }));
      this.conversation = this.conversation.map(m => m.id === msgId ? res : m);
      this.editingMsgId = null;
      this.editContent = '';
    } catch (err) {
      console.error("Failed to edit message", err);
    }
  }

  onEditKeyDown(event: KeyboardEvent, msgId: number) {
    if (event.key === 'Enter') {
      this.handleEditMessage(msgId);
    }
    if (event.key === 'Escape') {
      this.editingMsgId = null;
    }
  }

  isSharedPostMessage(msg: MessageResponseDTO): boolean {
    return !!msg.sharedPostId;
  }

  hasMessageText(msg: MessageResponseDTO): boolean {
    return !!msg.content && msg.content.trim().length > 0;
  }

  isSharedPostVideo(msg: MessageResponseDTO): boolean {
    const mediaType = (msg.sharedPostMediaType || '').toUpperCase();
    if (mediaType === 'VIDEO') {
      return true;
    }

    const url = (msg.sharedPostMediaUrl || '').split('?')[0].toLowerCase();
    return ['.mp4', '.webm', '.ogg', '.mov', '.m4v'].some(ext => url.endsWith(ext));
  }

  async openSharedPost(msg: MessageResponseDTO) {
    if (!msg.sharedPostId || !msg.sharedPostAuthorUsername) {
      return;
    }

    await this.router.navigate(
      ['/profile', msg.sharedPostAuthorUsername],
      { queryParams: { postId: msg.sharedPostId } }
    );
  }

  get unreadThreadCount(): number {
    return this.partners.filter(p => Number(p?.unreadCount) > 0).length;
  }

  private sortPartners(partners: any[]): any[] {
    return [...partners].sort((a, b) => {
      const aUnread = Number(a?.unreadCount) || 0;
      const bUnread = Number(b?.unreadCount) || 0;
      if (aUnread !== bUnread) {
        return bUnread - aUnread;
      }
      return (a?.username || '').localeCompare(b?.username || '');
    });
  }

  get primaryPartners(): any[] {
    return this.partners.filter(partner => {
      const id = Number(partner?.id);
      if (!id || this.declinedRequestIds.has(id)) {
        return false;
      }
      const isFollowing = this.followingIds.has(id);
      const isApproved = this.approvedRequestIds.has(id);
      return isFollowing || isApproved;
    });
  }

  get requestPartners(): any[] {
    return this.partners.filter(partner => {
      const id = Number(partner?.id);
      if (!id || this.declinedRequestIds.has(id)) {
        return false;
      }
      const isFollowing = this.followingIds.has(id);
      const isApproved = this.approvedRequestIds.has(id);
      return !isFollowing && !isApproved;
    });
  }

  get visiblePartners(): any[] {
    if (this.searchQuery.trim()) {
      return [];
    }
    if (this.activeInboxTab === 'REQUESTS') {
      return this.requestPartners;
    }
    return this.primaryPartners;
  }

  isActiveContactRequest(): boolean {
    const id = Number(this.activeContact?.id);
    return !!id && this.requestPartners.some(p => Number(p?.id) === id);
  }

  approveRequest(contact: any) {
    const id = Number(contact?.id);
    if (!id) {
      return;
    }
    this.approvedRequestIds.add(id);
    this.declinedRequestIds.delete(id);
    this.persistRequestState();
    this.activeInboxTab = 'PRIMARY';
  }

  declineRequest(contact: any) {
    const id = Number(contact?.id);
    if (!id) {
      return;
    }
    this.declinedRequestIds.add(id);
    this.approvedRequestIds.delete(id);
    this.persistRequestState();
    if (Number(this.activeContact?.id) === id) {
      this.activeContact = null;
      this.conversation = [];
    }
  }

  private async fetchLastSenderId(partnerId: number): Promise<number | null> {
    try {
      const conversation = await firstValueFrom(this.api.get<MessageResponseDTO[]>(`/api/messages/conversation/${partnerId}`));
      const last = (conversation || [])[conversation.length - 1];
      if (!last?.senderId) {
        return null;
      }
      return Number(last.senderId);
    } catch {
      return null;
    }
  }

  private loadRequestState() {
    const userId = Number(this.user?.id) || 0;
    if (!userId) {
      return;
    }
    this.approvedRequestIds = this.readIdSet(`msg-approved-${userId}`);
    this.declinedRequestIds = this.readIdSet(`msg-declined-${userId}`);
  }

  private persistRequestState() {
    const userId = Number(this.user?.id) || 0;
    if (!userId) {
      return;
    }
    localStorage.setItem(`msg-approved-${userId}`, JSON.stringify(Array.from(this.approvedRequestIds)));
    localStorage.setItem(`msg-declined-${userId}`, JSON.stringify(Array.from(this.declinedRequestIds)));
  }

  private readIdSet(key: string): Set<number> {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) {
        return new Set<number>();
      }
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return new Set<number>();
      }
      return new Set<number>(parsed.map(v => Number(v)).filter(v => Number.isFinite(v)));
    } catch {
      return new Set<number>();
    }
  }

  @HostListener('window:resize')
  onResize() {
    this.updateViewportMode();
  }

  private updateViewportMode() {
    this.isMobileView = typeof window !== 'undefined' && window.innerWidth <= 860;
    if (!this.isMobileView) {
      this.showConversationOnMobile = false;
    }
  }
}
