export interface MessageResponseDTO {
  id: number;
  senderId: number;
  senderName: string;
  receiverId: number;
  receiverName: string;
  content: string;
  sharedPostId?: number;
  sharedPostMediaUrl?: string;
  sharedPostMediaType?: string;
  sharedPostDescription?: string;
  sharedPostAuthorUsername?: string;
  timestamp: string;
}

export interface SharedPostPayload {
  postId: number;
  mediaUrl?: string;
  mediaType?: string;
  description?: string;
  authorUsername?: string;
}

export interface SendMessageRequest {
  content?: string;
  sharedPost?: SharedPostPayload;
}

export interface MessagePartner {
  userId: number;
  username: string;
  profilePicture?: string;
  lastMessage?: string;
  lastMessageTime?: string;
}
