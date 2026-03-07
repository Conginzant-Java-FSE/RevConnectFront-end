import { User } from './user.model';

export interface Story {
  id: number;
  mediaUrl: string;
  mediaType: string;
  createdAt: string;
  expiresAt: string;
  isActive: boolean;
  user: User;
}
