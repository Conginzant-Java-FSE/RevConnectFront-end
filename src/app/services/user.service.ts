import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { User, UserProfile, AccountDetailsUpdateDTO, PasswordUpdateDTO } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class UserService {
  private api = inject(ApiService);

  // ── Profile ──
  getMyProfile(): Observable<any> {
    return this.api.get<any>('/userProfile/me');
  }

  getProfileByUsername(username: string): Observable<any> {
    return this.api.get<any>(`/userProfile/view/${username}`);
  }

  addUserProfile(userId: number, profile: Partial<UserProfile>): Observable<any> {
    return this.api.post<any>(`/userProfile/addUserProfile/${userId}`, profile);
  }

  updateProfilePicture(profilepicURL: string): Observable<any> {
    return this.api.put<any>('/userProfile/updatePic', { profilepicURL });
  }

  updatePrivacy(isPublic: boolean): Observable<any> {
    return this.api.put<any>('/userProfile/privacy', { isPublic });
  }

  // ── Settings ──
  updateAccountDetails(data: AccountDetailsUpdateDTO): Observable<string> {
    return this.api.put<string>('/settings/account', data);
  }

  updatePassword(data: PasswordUpdateDTO): Observable<string> {
    return this.api.put<string>('/settings/password', data);
  }

  deactivateAccount(password: string): Observable<string> {
    return this.api.put<string>('/settings/deactivate', { password });
  }

  deleteAccount(password: string): Observable<any> {
    return this.api.put<any>('/settings/delete', { password });
  }

  // ── Search ──
  searchUsers(query: string): Observable<User[]> {
    return this.api.get<User[]>(`/auth/search?query=${query}`);
  }

  getAllUsers(): Observable<User[]> {
    return this.api.get<User[]>('/auth/allUsers');
  }
}
