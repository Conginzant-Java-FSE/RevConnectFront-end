export type UserRole = 'USER' | 'CREATER' | 'Business_Account_User';

export interface UserProfile {
  id: number;
  fullName: string;
  bio?: string;
  location?: string;
  age?: number;
  gender?: string;
  profilepicURL?: string;
  isPublic: boolean;
  allowMessages: boolean;
  showActivityStatus: boolean;
}

export interface CreatorProfile {
  id: number;
  displayName: string;
  bio?: string;
  niche?: string;
  creatorCategoryLabel?: string;
  profileGridLayout?: 'CLASSIC' | 'FEATURED' | 'MAGAZINE' | string;
  linkInBioLinks?: string[];
  profilepicURL?: string;
}

export interface BusinessProfile {
  id: number;
  businessName: string;
  businessCategory?: string;
  description?: string;
  website?: string;
  contactEmail?: string;
  contactPhone?: string;
  logoUrl?: string;
  businessAddress?: string;
  businessHours?: string;
  externalLinks?: string;
  allowMessages: boolean;
  verified: boolean;
  isPublic: boolean;
}

export interface User {
  id: number;
  username: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  userProfile?: UserProfile;
  creatorProfile?: CreatorProfile;
  businessProfile?: BusinessProfile;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
  confirmPassword: string;
  role: UserRole;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface AccountDetailsUpdateDTO {
  username: string;
  email: string;
}

export interface PasswordUpdateDTO {
  oldPassword: string;
  newPassword: string;
}
