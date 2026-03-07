import { Post } from './post.model';
import { User } from './user.model';

export interface SavedPost {
  id: number;
  user: User;
  post: Post;
  createdAt: string;
}
