import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { MessageResponseDTO } from '../models/message.model';

@Injectable({ providedIn: 'root' })
export class MessageService {
  private api = inject(ApiService);

  sendMessage(receiverId: number, content: string): Observable<MessageResponseDTO> {
    return this.api.post<MessageResponseDTO>(`/api/messages/send/${receiverId}`, { content });
  }

  getConversation(userId: number): Observable<MessageResponseDTO[]> {
    return this.api.get<MessageResponseDTO[]>(`/api/messages/conversation/${userId}`);
  }

  getMessagePartners(): Observable<any[]> {
    return this.api.get<any[]>('/api/messages/partners');
  }

  getUnreadCount(): Observable<number> {
    return this.api.get<number>('/api/messages/unread/count');
  }

  editMessage(messageId: number, content: string): Observable<MessageResponseDTO> {
    return this.api.put<MessageResponseDTO>(`/api/messages/${messageId}`, { content });
  }

  deleteMessage(messageId: number): Observable<string> {
    return this.api.delete<string>(`/api/messages/${messageId}`);
  }
}
