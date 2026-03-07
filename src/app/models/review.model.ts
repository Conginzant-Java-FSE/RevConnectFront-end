export interface Review {
  id: number;
  rating: number;
  comment: string;
  createdAt: string;
  businessUser: { id: number; username: string };
  reviewer: { id: number; username: string };
}
