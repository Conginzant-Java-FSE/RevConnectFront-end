export interface CommentRequestDTO {
  content: string;
}

export interface CommentResponseDTO {
  id: number;
  content: string;
  userId: number;
  username: string;
  postId: number;
  createdAt: string;
}
