import { Component, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { PostCardComponent } from '../../components/post-card/post-card.component';
import { firstValueFrom } from 'rxjs';
import { Product, ProductPayload } from '../../models/product.model';
import { CreateModalService } from '../../services/create-modal.service';

type ProfileTab = 'POSTS' | 'PRODUCTS' | 'SAVED' | 'TAGGED';

interface ProductFormState {
  productName: string;
  description: string;
  price: number;
  imageUrl: string;
  externalLink: string;
  stock: number;
  features: string;
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, PostCardComponent],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css'
})
export class ProfileComponent implements OnInit, OnDestroy {
  route = inject(ActivatedRoute);
  authService = inject(AuthService);
  api = inject(ApiService);
  createModalService = inject(CreateModalService);

  usernameParam: string | null = null;
  userProfile: any = null;
  posts: any[] = [];
  products: Product[] = [];
  savedPostsProfile: any[] = [];
  taggedPosts: any[] = [];
  activeTab: ProfileTab = 'POSTS';
  loading = true;
  error = '';
  followStatus: 'Follow' | 'Follow Back' | 'Following' | 'Pending' = 'Follow';
  followActionPending = false;
  highlightedPostId: number | null = null;
  requestedPostId: number | null = null;

  followersCount = 0;
  followingCount = 0;
  followersList: Array<{
    followerId: number;
    followerUsername: string;
    displayName: string;
    avatarUrl: string;
    relationStatus: 'Follow' | 'Following' | 'Pending';
    confirmUnfollow: boolean;
  }> = [];
  followingList: Array<{ followingId: number; followingUsername: string; displayName: string; avatarUrl: string }> = [];
  showFollowListModal = false;
  activeFollowListType: 'followers' | 'following' = 'followers';
  loadingFollowList = false;
  followListSearchQuery = '';

  isEditingPic = false;
  newPicUrl = '';

  selectedProduct: Product | null = null;
  isProductModalOpen = false;

  isAddProductModalOpen = false;
  isSubmittingProduct = false;
  loadingSavedPostsProfile = false;
  selectedGridPost: any = null;
  showPostPreviewModal = false;
  showPostPreviewMenu = false;
  showProfileShareModal = false;
  @ViewChild(PostCardComponent) postPreviewCard?: PostCardComponent;
  private scheduleBadgeTimer: any = null;
  editingProductId: number | null = null;
  productForm: ProductFormState = {
    productName: '',
    description: '',
    price: 0,
    imageUrl: '',
    externalLink: '',
    stock: 0,
    features: ''
  };

  readonly defaultProductImage =
    'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=900&auto=format&fit=crop';

  get isOwnProfile(): boolean {
    const activeUsername = this.authService.currentUser?.username;
    return !this.usernameParam || this.usernameParam === activeUsername;
  }

  get currentUserRole(): string {
    return this.authService.currentUser?.role || '';
  }

  get profileRole(): string {
    return this.userProfile?.role || this.authService.currentUser?.role || '';
  }

  get isBusinessProfile(): boolean {
    return this.profileRole === 'Business_Account_User';
  }

  get isCreatorProfile(): boolean {
    return this.profileRole === 'CREATER';
  }

  get canManageCreatorPosts(): boolean {
    return this.isOwnProfile && this.currentUserRole === 'CREATER';
  }

  get creatorCategoryLabel(): string {
    return this.userProfile?.creatorProfile?.creatorCategoryLabel || '';
  }

  get creatorLinks(): string[] {
    const links = this.userProfile?.creatorProfile?.linkInBioLinks;
    if (!Array.isArray(links)) return [];
    return links.filter((link: string) => !!link);
  }

  get creatorGridClass(): string {
    const layout = (this.userProfile?.creatorProfile?.profileGridLayout || 'CLASSIC').toUpperCase();
    if (layout === 'FEATURED') return 'creator-grid-featured';
    if (layout === 'MAGAZINE') return 'creator-grid-magazine';
    return 'creator-grid-classic';
  }

  get businessCategory(): string {
    return this.userProfile?.businessProfile?.businessCategory || '';
  }

  get businessAddress(): string {
    return this.userProfile?.businessProfile?.businessAddress || this.userProfile?.businessAddress || '';
  }

  get businessHours(): string {
    return this.userProfile?.businessProfile?.businessHours || '';
  }

  get businessWebsite(): string {
    return this.userProfile?.businessProfile?.website || this.userProfile?.website || '';
  }

  get businessEmail(): string {
    return this.userProfile?.businessProfile?.contactEmail || this.userProfile?.contactEmail || '';
  }

  get businessPhone(): string {
    return this.userProfile?.businessProfile?.contactPhone || this.userProfile?.contactPhone || '';
  }

  get businessDirectionsLink(): string {
    const address = this.businessAddress?.trim();
    if (!address) {
      return '';
    }
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  }

  get profilePic(): string {
    return this.userProfile?.userProfile?.profilepicURL ||
      this.userProfile?.creatorProfile?.profilepicURL ||
      this.userProfile?.businessProfile?.logoUrl ||
      '/assets/default-avatar.svg';
  }

  get fullName(): string {
    return this.userProfile?.userProfile?.fullName ||
      this.userProfile?.creatorProfile?.displayName ||
      this.userProfile?.businessProfile?.businessName ||
      this.userProfile?.username || '';
  }

  get bio(): string {
    return this.userProfile?.userProfile?.bio ||
      this.userProfile?.creatorProfile?.bio ||
      this.userProfile?.businessProfile?.description ||
      'Welcome to RevConnect! Personalize your profile in settings.';
  }

  get profileShareLink(): string {
    const username = this.userProfile?.username || this.authService.currentUser?.username || '';
    if (!username) {
      return '';
    }
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return `${origin}/profile/${encodeURIComponent(username)}`;
  }

  get profileQrCodeUrl(): string {
    const link = this.profileShareLink;
    if (!link) {
      return '';
    }
    return `https://api.qrserver.com/v1/create-qr-code/?size=420x420&margin=12&data=${encodeURIComponent(link)}`;
  }

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      this.usernameParam = params.get('username');
      this.requestedPostId = this.parseRequestedPostId();
      this.fetchProfileData();
    });

    this.route.queryParamMap.subscribe(() => {
      this.requestedPostId = this.parseRequestedPostId();
      this.focusRequestedPost();
    });
  }

  ngOnDestroy(): void {
    if (this.scheduleBadgeTimer) {
      clearInterval(this.scheduleBadgeTimer);
      this.scheduleBadgeTimer = null;
    }
    document.body.style.overflow = '';
  }

  async fetchProfileData() {
    this.loading = true;
    this.error = '';
    try {
      let userRes: any;
      if (this.isOwnProfile) {
        const role = this.currentUserRole;
        if (role === 'Business_Account_User') {
          userRes = await firstValueFrom(this.api.get<any>('/business/profile'));
        } else if (role === 'CREATER') {
          userRes = await firstValueFrom(this.api.get<any>('/creatorProfile/me'));
        } else {
          userRes = await firstValueFrom(this.api.get<any>('/userProfile/me'));
        }
      } else {
        userRes = await firstValueFrom(this.api.get<any>(`/userProfile/view/${this.usernameParam}`));
      }

      if (this.isOwnProfile && userRes) {
        const finalUser = { ...this.authService.currentUser, ...userRes };
        this.userProfile = finalUser;
        this.authService.updateUser(finalUser);
      } else {
        this.userProfile = userRes;
      }

      this.activeTab = this.isBusinessProfile ? 'PRODUCTS' : 'POSTS';

      const postsUrl = this.isOwnProfile
        ? '/revconnect/users/getAllposts'
        : `/revconnect/users/posts/user/${this.usernameParam}`;
      const postsRes = await firstValueFrom(this.api.get<any[]>(postsUrl));

      this.posts = (postsRes || []).map(dto => ({
        ...dto,
        authorUsername: dto.userName,
        content: dto.description,
        createdAt: dto.createdAt || new Date(),
        mediaType: dto.mediaType || '',
        isPinned: !!dto.isPinned,
        isPublished: dto.isPublished !== false,
        scheduledAt: dto.scheduledAt || null,
        likeCount: dto.likeCount || 0,
        commentCount: dto.commentCount || 0
      }));

      const taggedUsername = (
        this.userProfile?.username
        || this.usernameParam
        || this.authService.currentUser?.username
        || ''
      ).toString().trim();
      if (taggedUsername) {
        const taggedRes = await firstValueFrom(
          this.api.get<any[]>(`/revconnect/users/posts/tagged/${encodeURIComponent(taggedUsername)}`)
        ).catch(() => []);

        this.taggedPosts = (taggedRes || []).map(dto => ({
          ...dto,
          authorUsername: dto.userName,
          content: dto.description,
          createdAt: dto.createdAt || new Date(),
          mediaType: dto.mediaType || '',
          isPinned: !!dto.isPinned,
          isPublished: dto.isPublished !== false,
          scheduledAt: dto.scheduledAt || null,
          likeCount: dto.likeCount || 0,
          commentCount: dto.commentCount || 0
        }));
      } else {
        this.taggedPosts = [];
      }

      this.updateScheduledPostStates();
      this.startScheduleWatcher();
      this.sortPostsForProfile();
      this.focusRequestedPost();

      await this.fetchFollowCounts();

      if (this.isBusinessProfile) {
        await this.fetchBusinessData();
      } else {
        this.products = [];
      }

      if (this.isOwnProfile) {
        await this.fetchSavedPostsForProfile();
      } else {
        this.savedPostsProfile = [];
      }

      if (!this.isOwnProfile) {
        await this.checkFollowStatus();
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
      this.error = 'Failed to load profile data.';
    } finally {
      this.loading = false;
    }
  }

  async fetchFollowCounts() {
    try {
      const followersCountUrl = this.isOwnProfile
        ? '/revconnect/users/followers/count'
        : `/revconnect/users/followers/count/${this.usernameParam}`;
      const followingCountUrl = this.isOwnProfile
        ? '/revconnect/users/following/count'
        : `/revconnect/users/following/count/${this.usernameParam}`;

      const [followersRes, followingRes] = await Promise.all([
        firstValueFrom(this.api.get<any>(followersCountUrl)),
        firstValueFrom(this.api.get<any>(followingCountUrl))
      ]);
      this.followersCount = followersRes ?? 0;
      this.followingCount = followingRes ?? 0;
    } catch (err) {
      console.error('Failed to fetch follow counts', err);
    }
  }

  async fetchBusinessData() {
    try {
      const targetUserId = this.userProfile?.id;
      if (!targetUserId) return;

      const productsRes = await firstValueFrom(
        this.api.get<Product[]>(`/business/products/user/${targetUserId}`)
      ).catch(() => []);

      this.products = (productsRes || []).map(product => this.normalizeProduct(product));
    } catch (err) {
      console.error('Failed to fetch business data', err);
    }
  }

  async checkFollowStatus() {
    if (this.isOwnProfile || !this.userProfile) return;
    try {
      const targetUserId = Number(this.userProfile?.id);
      const followingRes = await firstValueFrom(this.api.get<any[]>('/revconnect/users/following'));
      const isFollowing = (followingRes || []).some(
        (f: any) => Number(f.followingId) === targetUserId
      );
      if (isFollowing) {
        this.followStatus = 'Following';
        return;
      }

      const pendingRes = await firstValueFrom(this.api.get<any[]>('/follow/requests/sent'));
      const isPending = (pendingRes || []).some(
        (req: any) =>
          ((Number(req?.senderId) === Number(this.authService.currentUser?.id))
            || (Number(req?.sender?.id) === Number(this.authService.currentUser?.id)))
          && ((Number(req?.receiverId) === targetUserId) || (Number(req?.receiver?.id) === targetUserId))
      );
      if (isPending) {
        this.followStatus = 'Pending';
      } else {
        const followersRes = await firstValueFrom(this.api.get<any[]>('/revconnect/users/followers'));
        const targetFollowsMe = (followersRes || []).some(
          (f: any) => Number(f.followerId) === targetUserId
        );
        this.followStatus = targetFollowsMe ? 'Follow Back' : 'Follow';
      }
    } catch (err) {
      console.error(err);
    }
  }

  async handleUpdatePicture() {
    if (!this.newPicUrl.trim()) return;
    try {
      const activeUser = this.authService.currentUser;
      if (!activeUser) return;

      let endpoint = '/userProfile/updatePic';
      let payload: any = { profilePicUrl: this.newPicUrl };

      if (activeUser.role === 'CREATER') {
        endpoint = '/creatorProfile/updatePic';
      } else if (activeUser.role === 'Business_Account_User') {
        endpoint = '/business/profile/updatePic';
        payload = { logoUrl: this.newPicUrl };
      }

      const updatedProfile = await firstValueFrom(this.api.put<any>(endpoint, payload));

      if (this.isOwnProfile && updatedProfile) {
        const finalUser = { ...this.authService.currentUser, ...updatedProfile };
        if (!finalUser.username) {
          finalUser.username = this.authService.currentUser?.username;
        }
        this.userProfile = finalUser;
        this.authService.updateUser(finalUser);
      }

      this.isEditingPic = false;
      this.newPicUrl = '';
    } catch (err: any) {
      console.error('Failed to update profile picture', err);
      alert('Failed to update profile picture: ' + (err.error?.message || err.message || 'Unknown error'));
    }
  }

  async handleRemovePicture() {
    try {
      const activeUser = this.authService.currentUser;
      if (!activeUser) return;

      let endpoint = '/userProfile/updatePic';
      let payload: any = { profilePicUrl: null };

      if (activeUser.role === 'CREATER') {
        endpoint = '/creatorProfile/updatePic';
      } else if (activeUser.role === 'Business_Account_User') {
        endpoint = '/business/profile/updatePic';
        payload = { logoUrl: null };
      }

      const updatedProfile = await firstValueFrom(this.api.put<any>(endpoint, payload));

      if (this.isOwnProfile && updatedProfile) {
        const finalUser = { ...this.authService.currentUser, ...updatedProfile };
        if (!finalUser.username) {
          finalUser.username = this.authService.currentUser?.username;
        }
        this.userProfile = finalUser;
        this.authService.updateUser(finalUser);
      }
    } catch (err: any) {
      console.error('Failed to remove profile picture', err);
      alert('Failed to remove profile picture: ' + (err.error?.message || err.message || 'Unknown error'));
    }
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        this.newPicUrl = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  async handleConnect() {
    if (!this.userProfile || this.followActionPending || this.followStatus === 'Pending') return;

    this.followActionPending = true;
    try {
      if (this.followStatus === 'Following') {
        await this.performUnfollowTarget();
        this.followStatus = 'Follow';
      } else {
        const targetUserId = this.getTargetUserId();
        if (!targetUserId) {
          throw new Error('Target user id is missing');
        }

        try {
          const response = await firstValueFrom(this.api.post<any>(`/follow/request/${targetUserId}`, {}));
          this.followStatus = this.mapFollowStatusFromResponse(response);
        } catch (requestErr: any) {
          const requestMessage = this.extractErrorMessage(requestErr);
          if (requestMessage.includes('already following') || requestMessage.includes('already followed')) {
            this.followStatus = 'Following';
          } else if (requestMessage.includes('pending') || requestMessage.includes('already requested')) {
            this.followStatus = 'Pending';
          } else {
            await firstValueFrom(this.api.post<any>(`/revconnect/users/following/${targetUserId}`, {}));
            this.followStatus = 'Following';
          }
        }
      }
      await this.refreshFollowDataAfterMutation();
    } catch (err: any) {
      const message = this.extractErrorMessage(err);
      if (message.includes('already following') || message.includes('already followed')) {
        this.followStatus = 'Following';
        await this.refreshFollowDataAfterMutation();
        return;
      }
      if (message.includes('pending') || message.includes('already requested')) {
        this.followStatus = 'Pending';
        await this.refreshFollowDataAfterMutation();
        return;
      }
      console.error('Failed to update follow status', err);
      alert('Could not update follow status.');
    } finally {
      this.followActionPending = false;
    }
  }

  async openFollowList(type: 'followers' | 'following') {
    this.activeFollowListType = type;
    this.showFollowListModal = true;
    this.loadingFollowList = true;

    try {
      const endpoint = this.resolveFollowListEndpoint(type);
      const listRes = await firstValueFrom(this.api.get<any[]>(endpoint));

      if (type === 'followers') {
        const rawFollowers: Array<{
          followerId: number;
          followerUsername: string;
          displayName: string;
          avatarUrl: string;
          relationStatus: 'Follow' | 'Following' | 'Pending';
          confirmUnfollow: boolean;
        }> = (listRes || []).map(item => ({
          followerId: Number(item?.followerId) || 0,
          followerUsername: (item?.followerUsername || '').toString(),
          displayName: (item?.followerFullName || item?.followerUsername || '').toString(),
          avatarUrl: (item?.followerProfilePic || item?.followerAvatarUrl || '').toString(),
          relationStatus: 'Follow',
          confirmUnfollow: false
        }));
        const deduped = this.dedupeByUsername(rawFollowers, user => user.followerUsername);
        if (this.isOwnProfile) {
          const followingRes = await firstValueFrom(this.api.get<any[]>('/revconnect/users/following')).catch(() => []);
          const followingUsernames = new Set(
            (followingRes || []).map((f: any) => (f?.followingUsername || '').toString().toLowerCase())
          );
          for (const follower of deduped) {
            if (followingUsernames.has(follower.followerUsername.toLowerCase())) {
              follower.relationStatus = 'Following';
            }
          }
        }
        this.followersList = deduped;
      } else {
        const rawFollowing = (listRes || []).map(item => ({
          followingId: Number(item?.followingId) || 0,
          followingUsername: (item?.followingUsername || '').toString(),
          displayName: (item?.followingFullName || item?.followingUsername || '').toString(),
          avatarUrl: (item?.followingProfilePic || item?.followingAvatarUrl || '').toString()
        }));
        this.followingList = this.dedupeByUsername(rawFollowing, user => user.followingUsername);
      }
    } catch (err) {
      console.error(`Failed to load ${type} list`, err);
      if (type === 'followers') {
        this.followersList = [];
      } else {
        this.followingList = [];
      }
    } finally {
      this.loadingFollowList = false;
    }
  }

  closeFollowListModal() {
    this.showFollowListModal = false;
    this.followListSearchQuery = '';
  }

  async fetchSavedPostsForProfile() {
    this.loadingSavedPostsProfile = true;
    try {
      const saved = await firstValueFrom(this.api.get<any[]>('/saved')).catch(() => []);
      this.savedPostsProfile = (saved || []).map(item => ({
        ...(item?.post || {}),
        id: item?.post?.id,
        postId: item?.post?.id,
        authorUsername: item?.post?.userName || item?.post?.authorUsername || '',
        content: item?.post?.description || item?.post?.content || '',
        description: item?.post?.description || item?.post?.content || '',
        mediaUrl: item?.post?.mediaUrl || '',
        mediaType: item?.post?.mediaType || ''
      }));
    } catch {
      this.savedPostsProfile = [];
    } finally {
      this.loadingSavedPostsProfile = false;
    }
  }

  async unfollowFromList(followingId: number, followingUsername: string) {
    if (!this.isOwnProfile || !followingId) return;

    try {
      try {
        await firstValueFrom(
          this.api.delete(`/revconnect/users/following/${followingId}`, { responseType: 'text' as 'json' })
        );
      } catch {
        await firstValueFrom(
          this.api.delete(`/revconnect/users/following/username/${encodeURIComponent(followingUsername)}`, {
            responseType: 'text' as 'json'
          })
        );
      }

      this.followingList = this.followingList.filter(item =>
        Number(item.followingId) !== Number(followingId)
        && item.followingUsername.toLowerCase() !== followingUsername.toLowerCase()
      );
      await this.fetchFollowCounts();
    } catch (err) {
      console.error('Failed to unfollow', err);
      alert('Could not unfollow this user.');
    }
  }

  get followButtonLabel(): string {
    if (this.followActionPending) return 'Please wait...';
    return this.followStatus;
  }

  private resolveFollowListEndpoint(type: 'followers' | 'following'): string {
    if (this.isOwnProfile || !this.usernameParam) {
      return `/revconnect/users/${type}`;
    }

    return `/revconnect/users/${type}/${this.usernameParam}`;
  }

  private getTargetUserId(): number | null {
    const directId = Number(this.userProfile?.id);
    if (Number.isFinite(directId) && directId > 0) {
      return directId;
    }

    const nestedId = Number(this.userProfile?.user?.id);
    if (Number.isFinite(nestedId) && nestedId > 0) {
      return nestedId;
    }

    return null;
  }

  get filteredFollowersList() {
    const query = (this.followListSearchQuery || '').trim().toLowerCase();
    if (!query) {
      return this.followersList;
    }
    return this.followersList.filter(user =>
      user.followerUsername.toLowerCase().includes(query)
      || user.displayName.toLowerCase().includes(query)
    );
  }

  async toggleFollowerRelation(user: {
    followerId: number;
    followerUsername: string;
    relationStatus: 'Follow' | 'Following' | 'Pending';
    confirmUnfollow: boolean;
  }) {
    if (!this.isOwnProfile) {
      return;
    }

    if (user.relationStatus === 'Following') {
      if (!user.confirmUnfollow) {
        user.confirmUnfollow = true;
        return;
      }
      try {
        await firstValueFrom(
          this.api.delete(`/revconnect/users/following/${user.followerId}`, { responseType: 'text' as 'json' })
        );
      } catch {
        await firstValueFrom(
          this.api.delete(`/revconnect/users/following/username/${encodeURIComponent(user.followerUsername)}`, {
            responseType: 'text' as 'json'
          })
        );
      }
      user.relationStatus = 'Follow';
      user.confirmUnfollow = false;
      await this.fetchFollowCounts();
      return;
    }

    if (user.relationStatus === 'Pending') {
      return;
    }

    try {
      const response = await firstValueFrom(this.api.post<any>(`/follow/request/${user.followerId}`, {}));
      const mapped = this.mapFollowStatusFromResponse(response);
      user.relationStatus = mapped;
      user.confirmUnfollow = false;
      if (mapped === 'Following') {
        await this.fetchFollowCounts();
      }
    } catch (err: any) {
      const message = this.extractErrorMessage(err);
      if (message.includes('already following') || message.includes('already followed')) {
        user.relationStatus = 'Following';
        user.confirmUnfollow = false;
        await this.fetchFollowCounts();
        return;
      }
      if (message.includes('pending') || message.includes('already requested')) {
        user.relationStatus = 'Pending';
        user.confirmUnfollow = false;
        return;
      }
      alert('Could not update follow status.');
    }
  }

  cancelFollowerUnfollow(user: { confirmUnfollow: boolean }) {
    user.confirmUnfollow = false;
  }

  get filteredFollowingList() {
    const query = (this.followListSearchQuery || '').trim().toLowerCase();
    if (!query) {
      return this.followingList;
    }
    return this.followingList.filter(user =>
      user.followingUsername.toLowerCase().includes(query)
      || user.displayName.toLowerCase().includes(query)
    );
  }

  getInitial(username: string): string {
    const value = (username || '').trim();
    return value ? value.charAt(0).toUpperCase() : '?';
  }

  private dedupeByUsername<T>(list: T[], usernameAccessor: (item: T) => string): T[] {
    const seen = new Set<string>();
    const deduped: T[] = [];
    for (const item of list) {
      const key = usernameAccessor(item).trim().toLowerCase();
      if (!key || seen.has(key)) {
        continue;
      }
      seen.add(key);
      deduped.push(item);
    }
    return deduped;
  }

  private async performUnfollowTarget() {
    if (this.usernameParam) {
      await firstValueFrom(
        this.api.delete(`/revconnect/users/following/username/${encodeURIComponent(this.usernameParam)}`, {
          responseType: 'text' as 'json'
        })
      );
      return;
    }

    const targetUserId = this.getTargetUserId();
    if (!targetUserId) {
      throw new Error('Target user id is missing');
    }

    await firstValueFrom(
      this.api.delete(`/revconnect/users/following/${targetUserId}`, { responseType: 'text' as 'json' })
    );
  }

  private async refreshFollowDataAfterMutation() {
    await this.fetchFollowCounts();
    if (!this.isOwnProfile) {
      await this.checkFollowStatus();
    }

    if (this.showFollowListModal) {
      await this.openFollowList(this.activeFollowListType);
    }
  }

  async togglePinPost(post: any, event: Event) {
    event.stopPropagation();
    if (!this.canManageCreatorPosts || !post?.postId) return;

    try {
      const endpoint = post.isPinned
        ? `/revconnect/users/posts/${post.postId}/unpin`
        : `/revconnect/users/posts/${post.postId}/pin`;
      const updated = await firstValueFrom(this.api.put<any>(endpoint, {}));
      post.isPinned = !!updated?.isPinned;
      this.sortPostsForProfile();
    } catch (err) {
      console.error('Failed to update pinned status', err);
      alert('Unable to update pin status. You can pin up to 3 posts.');
    }
  }

  private mapFollowStatusFromResponse(response: any): 'Following' | 'Pending' {
    const rawMessage = typeof response === 'string' ? response : response?.message;
    const message = (rawMessage || '').toString().toLowerCase();

    if (message.includes('followed') || message.includes('already following')) {
      return 'Following';
    }

    return 'Pending';
  }

  private extractErrorMessage(err: any): string {
    const raw = typeof err?.error === 'string'
      ? err.error
      : err?.error?.message || err?.message || '';
    return raw.toString().toLowerCase();
  }

  isScheduledPending(post: any): boolean {
    if (!post?.scheduledAt || post?.isPublished !== false) {
      return false;
    }
    return new Date(post.scheduledAt).getTime() > Date.now();
  }

  isScheduledPosted(post: any): boolean {
    if (!post?.scheduledAt) {
      return false;
    }
    return post?.isPublished === true || new Date(post.scheduledAt).getTime() <= Date.now();
  }

  private startScheduleWatcher() {
    if (this.scheduleBadgeTimer) {
      clearInterval(this.scheduleBadgeTimer);
    }
    this.scheduleBadgeTimer = setInterval(() => this.updateScheduledPostStates(), 30000);
  }

  private updateScheduledPostStates() {
    const now = Date.now();
    this.posts = this.posts.map(post => {
      if (post?.isPublished === false && post?.scheduledAt) {
        const due = new Date(post.scheduledAt).getTime() <= now;
        if (due) {
          return { ...post, isPublished: true };
        }
      }
      return post;
    });
  }

  openProductModal(product: Product) {
    this.selectedProduct = this.normalizeProduct(product);
    this.isProductModalOpen = true;
    document.body.style.overflow = 'hidden';
  }

  closeProductModal() {
    this.isProductModalOpen = false;
    setTimeout(() => {
      this.selectedProduct = null;
      document.body.style.overflow = '';
    }, 300);
  }

  getProductFeatures(product: Product | null): string[] {
    if (!product?.features) {
      return [];
    }

    return product.features
      .split(/\r?\n|,/)
      .map(feature => feature.trim())
      .filter(Boolean);
  }

  getVisibleProductFeatures(product: Product | null, max = 3): string[] {
    return this.getProductFeatures(product).slice(0, max);
  }

  getOrderLink(product: Product | null): string | null {
    const rawLink = (product?.externalLink || '').trim();
    if (!rawLink) {
      return null;
    }

    const normalizedLink = /^https?:\/\//i.test(rawLink) ? rawLink : `https://${rawLink}`;
    try {
      const parsed = new URL(normalizedLink);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return null;
      }
      return parsed.toString();
    } catch {
      return null;
    }
  }

  getProductImage(product: Product | null): string {
    return (product?.imageUrl || '').trim() || this.defaultProductImage;
  }

  getProductPrice(product: Product | null): string {
    if (!product) {
      return '0.00';
    }

    const safePrice = Number.isFinite(product.price) ? product.price : 0;
    return safePrice.toFixed(2);
  }

  openAddProductModal(productToEdit?: Product) {
    if (productToEdit) {
      this.editingProductId = productToEdit.id;
      this.productForm = {
        productName: productToEdit.productName || '',
        description: productToEdit.description || '',
        price: Number(productToEdit.price) || 0,
        imageUrl: productToEdit.imageUrl || '',
        externalLink: productToEdit.externalLink || '',
        stock: Number(productToEdit.stock) || 0,
        features: productToEdit.features || ''
      };
    } else {
      this.resetProductForm();
    }

    this.isAddProductModalOpen = true;
    document.body.style.overflow = 'hidden';
  }

  closeAddProductModal() {
    this.isAddProductModalOpen = false;
    setTimeout(() => {
      this.resetProductForm();
      document.body.style.overflow = '';
    }, 300);
  }

  async submitProduct() {
    const payload: ProductPayload = {
      productName: this.productForm.productName.trim(),
      description: this.productForm.description.trim(),
      price: Number(this.productForm.price),
      imageUrl: this.productForm.imageUrl.trim(),
      externalLink: this.productForm.externalLink.trim(),
      stock: Math.max(0, Number(this.productForm.stock) || 0),
      features: this.normalizeFeatures(this.productForm.features)
    };

    if (!payload.productName || payload.price < 0 || !Number.isFinite(payload.price)) {
      alert('Please provide a valid product name and price.');
      return;
    }

    this.isSubmittingProduct = true;
    try {
      if (this.editingProductId) {
        const updated = await firstValueFrom(
          this.api.put<Product>(`/business/products/${this.editingProductId}`, payload)
        );
        const index = this.products.findIndex(p => p.id === this.editingProductId);
        if (index > -1) {
          this.products[index] = this.normalizeProduct(updated);
        }
      } else {
        const added = await firstValueFrom(this.api.post<Product>('/business/products', payload));
        this.products.unshift(this.normalizeProduct(added));
      }

      this.closeAddProductModal();
    } catch (err: any) {
      console.error('Failed to save product', err);
      alert('Error saving product: ' + (err.error?.message || err.message || 'Unknown error'));
    } finally {
      this.isSubmittingProduct = false;
    }
  }

  async deleteProduct(productId: number, event?: Event) {
    if (event) {
      event.stopPropagation();
    }

    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
      await firstValueFrom(this.api.delete(`/business/products/${productId}`, { responseType: 'text' as 'json' }));
      this.products = this.products.filter(p => p.id !== productId);
    } catch (err: any) {
      console.error('Failed to delete product', err);
      alert('Error deleting product: ' + (err.error?.message || err.message || 'Unknown error'));
    }
  }

  isVideoPost(post: any): boolean {
    const preview = this.getPostPreviewMedia(post);
    return preview.type === 'VIDEO';
  }

  getPostPreviewMedia(post: any): { url: string; type: 'IMAGE' | 'VIDEO' } {
    const items = this.getPostMediaItems(post);
    if (items.length > 0) {
      return items[0];
    }
    return { url: '', type: 'IMAGE' };
  }

  postHasMultipleMedia(post: any): boolean {
    return this.getPostMediaItems(post).length > 1;
  }

  get activeGridPosts(): any[] {
    if (this.activeTab === 'TAGGED') {
      return this.taggedPosts;
    }
    if (this.activeTab === 'SAVED') {
      return this.savedPostsProfile;
    }
    return this.posts;
  }

  hasNoActiveTabPosts(): boolean {
    if (this.activeTab === 'TAGGED') {
      return this.taggedPosts.length === 0;
    }
    if (this.activeTab === 'SAVED') {
      return this.savedPostsProfile.length === 0;
    }
    return this.posts.length === 0;
  }

  openCreatePostFromProfile(event?: Event) {
    event?.preventDefault();
    this.createModalService.openCreateModal('POST');
  }

  openPostPreview(post: any) {
    this.selectedGridPost = post;
    this.showPostPreviewModal = true;
    this.showPostPreviewMenu = false;
    document.body.style.overflow = 'hidden';
  }

  closePostPreview() {
    this.showPostPreviewModal = false;
    this.selectedGridPost = null;
    this.showPostPreviewMenu = false;
    document.body.style.overflow = '';
  }

  togglePostPreviewMenu(event?: Event) {
    event?.stopPropagation();
    if (!this.canManageSelectedPost()) {
      return;
    }
    this.showPostPreviewMenu = !this.showPostPreviewMenu;
  }

  canManageSelectedPost(): boolean {
    const post = this.selectedGridPost;
    if (!post) {
      return false;
    }
    const ownerId = Number(post?.userId || post?.user?.id);
    const loggedInId = Number(this.authService.currentUser?.id);
    if (!!ownerId && !!loggedInId && ownerId === loggedInId) {
      return true;
    }
    const ownerUsername = (post?.authorUsername || post?.userName || post?.user?.username || '')
      .toString()
      .trim()
      .toLowerCase();
    const loggedInUsername = (this.authService.currentUser?.username || '')
      .toString()
      .trim()
      .toLowerCase();
    return !!ownerUsername && !!loggedInUsername && ownerUsername === loggedInUsername;
  }

  openProfileShareModal() {
    this.showProfileShareModal = true;
    document.body.style.overflow = 'hidden';
  }

  closeProfileShareModal() {
    this.showProfileShareModal = false;
    document.body.style.overflow = '';
  }

  async copyProfileLink() {
    const link = this.profileShareLink;
    if (!link) {
      return;
    }
    try {
      await navigator.clipboard.writeText(link);
      alert('Profile link copied.');
    } catch {
      alert('Could not copy link.');
    }
  }

  async shareProfileNative() {
    const link = this.profileShareLink;
    if (!link) {
      return;
    }

    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share({
          title: `${this.userProfile?.username || 'RevConnect'} on RevConnect`,
          text: `Check out this profile on RevConnect`,
          url: link
        });
        return;
      } catch {
        // user cancelled / unsupported target
      }
    }

    await this.copyProfileLink();
  }

  async downloadProfileQr() {
    const qrUrl = this.profileQrCodeUrl;
    if (!qrUrl) {
      return;
    }

    try {
      const response = await fetch(qrUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `${this.userProfile?.username || 'profile'}-qr.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(blobUrl);
    } catch {
      alert('Could not download QR code.');
    }
  }

  private resetProductForm() {
    this.editingProductId = null;
    this.productForm = {
      productName: '',
      description: '',
      price: 0,
      imageUrl: '',
      externalLink: '',
      stock: 0,
      features: ''
    };
  }

  private normalizeFeatures(rawFeatures: string): string {
    return rawFeatures
      .split(/\r?\n|,/)
      .map(feature => feature.trim())
      .filter(Boolean)
      .slice(0, 12)
      .join('\n');
  }

  private normalizeProduct(product: Partial<Product>): Product {
    return {
      id: Number(product.id) || 0,
      productName: (product.productName || '').trim(),
      description: (product.description || '').trim(),
      price: Number(product.price) || 0,
      imageUrl: (product.imageUrl || '').trim(),
      externalLink: (product.externalLink || '').trim(),
      stock: Math.max(0, Number(product.stock) || 0),
      features: (product.features || '').trim(),
      userId: Number(product.userId) || undefined
    };
  }

  private sortPostsForProfile() {
    this.posts = [...this.posts].sort((a, b) => {
      const aPinned = !!a.isPinned;
      const bPinned = !!b.isPinned;
      if (aPinned !== bPinned) return aPinned ? -1 : 1;

      const aTime = new Date(a.createdAt || 0).getTime();
      const bTime = new Date(b.createdAt || 0).getTime();
      return bTime - aTime;
    });
  }

  private getPostMediaItems(post: any): Array<{ url: string; type: 'IMAGE' | 'VIDEO' }> {
    const rawMedia = post?.mediaUrl;
    const fallbackType = (post?.mediaType || '').toString().toUpperCase();

    if (!rawMedia || typeof rawMedia !== 'string') {
      return [];
    }

    const trimmed = rawMedia.trim();
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          const items = parsed
            .map(item => {
              if (typeof item === 'string') {
                return {
                  url: item,
                  type: this.isVideoUrl(item) ? 'VIDEO' as const : 'IMAGE' as const
                };
              }

              const url = (item?.url || item?.mediaUrl || '').toString();
              if (!url) {
                return null;
              }
              const mediaType = (item?.type || item?.mediaType || '').toString().toUpperCase();
              return {
                url,
                type: mediaType === 'VIDEO' || this.isVideoUrl(url) ? 'VIDEO' as const : 'IMAGE' as const
              };
            })
            .filter(Boolean) as Array<{ url: string; type: 'IMAGE' | 'VIDEO' }>;

          if (items.length > 0) {
            return items;
          }
        }
      } catch {
        // fallback to single media parsing
      }
    }

    return [{
      url: trimmed,
      type: fallbackType === 'VIDEO' || this.isVideoUrl(trimmed) ? 'VIDEO' : 'IMAGE'
    }];
  }

  private isVideoUrl(url: string): boolean {
    if (!url) {
      return false;
    }
    if (url.startsWith('data:video/')) {
      return true;
    }
    const normalized = url.split('?')[0].toLowerCase();
    return ['.mp4', '.webm', '.ogg', '.mov', '.m4v'].some(ext => normalized.endsWith(ext));
  }

  private parseRequestedPostId(): number | null {
    const rawId = this.route.snapshot.queryParamMap.get('postId');
    const parsed = Number(rawId);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }

  private focusRequestedPost() {
    const targetPostId = this.requestedPostId;
    if (!targetPostId || !this.posts?.length) {
      return;
    }

    const exists = this.posts.some(post => Number(post?.postId || post?.id) === targetPostId);
    if (!exists) {
      return;
    }

    setTimeout(() => {
      const targetEl = document.getElementById(`post-${targetPostId}`);
      if (!targetEl) {
        return;
      }

      targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      this.highlightedPostId = targetPostId;
      setTimeout(() => {
        if (this.highlightedPostId === targetPostId) {
          this.highlightedPostId = null;
        }
      }, 2200);
    }, 180);
  }
}
