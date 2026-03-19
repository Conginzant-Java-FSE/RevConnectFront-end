import { User } from './user.model';

export type NotificationType =
  | 'LIKE'
  | 'COMMENT'
  | 'FOLLOW'
  | 'FOLLOW_REQUEST'
  | 'FOLLOW_ACCEPT'
  | 'FOLLOW_ACCEPTED'
  | 'MENTION'
  | 'POST_MENTION'
  | 'COMMENT_MENTION'
  | 'MESSAGE'
  | 'SHARE'
  | 'COLLAB_PROMOTION_REQUESTED'
  | 'COLLAB_PROMOTION_ACCEPTED'
  | 'COLLAB_PROMOTION_CONFIRMED'
  | 'COLLAB_PROMOTION_POST_CREATED'
  | 'COLLAB_PAYMENT_DONE'
  | 'COLLAB_POST_REQUEST';

export interface Notification {
  id: number;
  recipient: User;
  actor: User;
  type: NotificationType;
  referenceId?: number;
  isRead: boolean;
  createdAt: string;
}
