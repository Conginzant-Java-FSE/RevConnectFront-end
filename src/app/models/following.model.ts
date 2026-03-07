export interface FollowingResponseDTO {
  followingId: number;
  followingUsername: string;
}

export interface FollowerResponseDTO {
  followerId: number;
  followerUsername: string;
}

export interface FollowRequest {
  id: number;
  sender: {
    id: number;
    username: string;
    userProfile?: { profilepicURL?: string; fullName?: string };
  };
  receiver: {
    id: number;
    username: string;
  };
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  createdAt: string;
}
