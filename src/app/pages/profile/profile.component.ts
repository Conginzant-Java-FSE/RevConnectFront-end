import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { PostCardComponent } from '../../components/post-card/post-card.component';
import { firstValueFrom } from 'rxjs';
import { Product, ProductPayload } from '../../models/product.model';

type ProfileTab = 'POSTS' | 'PRODUCTS';

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

  usernameParam: string | null = null;
  userProfile: any = null;
  posts: any[] = [];
  products: Product[] = [];
  activeTab: ProfileTab = 'POSTS';
  loading = true;
  error = '';
  followStatus: 'Follow' | 'Follow Back' | 'Following' | 'Pending' = 'Follow';
  followActionPending = false;
  highlightedPostId: number | null = null;
  requestedPostId: number | null = null;

  followersCount = 0;
  followingCount = 0;
  followersList: Array<{ followerId: number; followerUsername: string }> = [];
  followingList: Array<{ followingId: number; followingUsername: string }> = [];
  showFollowListModal = false;
  activeFollowListType: 'followers' | 'following' = 'followers';
  loadingFollowList = false;

  isEditingPic = false;
  newPicUrl = '';

  selectedProduct: Product | null = null;
  isProductModalOpen = false;

  isAddProductModalOpen = false;
  isSubmittingProduct = false;
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
        (req: any) => req.senderId === this.authService.currentUser?.id
          && req.receiverId === targetUserId
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

        const response = await firstValueFrom(this.api.post<any>(`/follow/request/${targetUserId}`, {}));
        this.followStatus = this.mapFollowStatusFromResponse(response);
      }
      await this.refreshFollowDataAfterMutation();
    } catch (err) {
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
        this.followersList = (listRes || []).map(item => ({
          followerId: Number(item?.followerId) || 0,
          followerUsername: (item?.followerUsername || '').toString()
        }));
      } else {
        this.followingList = (listRes || []).map(item => ({
          followingId: Number(item?.followingId) || 0,
          followingUsername: (item?.followingUsername || '').toString()
        }));
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
  }

  async unfollowFromList(followingId: number) {
    if (!this.isOwnProfile || !followingId) return;

    try {
      await firstValueFrom(
        this.api.delete(`/revconnect/users/following/${followingId}`, { responseType: 'text' as 'json' })
      );
      this.followingList = this.followingList.filter(item => Number(item.followingId) !== Number(followingId));
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
