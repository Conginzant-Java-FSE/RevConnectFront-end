import { Component, OnInit, OnDestroy, ViewChild, ElementRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
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

  partners: any[] = [];
  searchResults: any[] = [];
  searchQuery = '';

  activeContact: any = null;
  conversation: MessageResponseDTO[] = [];
  newMessage = '';
  loading = false;
  editingMsgId: number | null = null;
  editContent = '';

  private pollInterval: any;

  @ViewChild('messagesEnd') messagesEndRef!: ElementRef;

  get user() {
    return this.authService.currentUser;
  }

  ngOnInit() {
    this.fetchPartners();
  }

  ngOnDestroy() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
  }

  async fetchPartners() {
    try {
      const res = await firstValueFrom(this.api.get<any[]>('/api/messages/partners'));
      this.partners = this.sortPartners(res || []);
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
      // Instantly fetch the updated convo
      this.fetchConversation(this.activeContact.id, false);
      this.fetchPartners(); // bump partner to top if necessary
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
}
