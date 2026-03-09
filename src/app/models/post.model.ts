import { User } from './user.model';

export interface Post {
  id: number;
  description?: string;
  boosted: boolean;
  boostBudget: number;
  boostStatus?: string;
  createdAt: string;
  updatedAt: string;
  mediaUrl?: string;
  mediaType?: string;
  productLink?: string;
  hashtags?: string;
  scheduledAt?: string;
  isPublished?: boolean;
  collabAccepted?: boolean;
  collaboratorId?: number;
  collaboratorUsername?: string;
  seriesName?: string;
  seriesOrder?: number;
  originalPostId?: number;
  isPinned: boolean;
  user: User;
}

export interface PostResponseDTO {
  postId: number;
  description?: string;
  userId: number;
  userName: string;
  authorProfilePicture?: string;
  mediaUrl?: string;
  mediaType?: string;
  productLink?: string;
  scheduledAt?: string;
  isPublished?: boolean;
  hashtags?: string;
  isPinned?: boolean;
  collabAccepted?: boolean;
  collaboratorId?: number;
  collaboratorUsername?: string;
  seriesName?: string;
  seriesOrder?: number;
  createdAt: string;
  likeCount?: number;
  commentCount?: number;
  saveCount?: number;
  shareCount?: number;
  isLiked?: boolean;
}

export interface CreatePostRequest {
  description?: string;
  mediaUrl?: string;
  mediaType?: string;
  productLink?: string;
  hashtags?: string;
  scheduledAt?: string;
  collaboratorId?: number;
  collaboratorUsername?: string;
  seriesName?: string;
  seriesOrder?: number;
  originalPostId?: number;
  isPinned?: boolean;
  boosted?: boolean;
  boostBudget?: number;
}
