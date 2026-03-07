import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { CreatorProfile } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class CreatorService {
  private api = inject(ApiService);

  saveCreatorProfile(profile: Partial<CreatorProfile>): Observable<any> {
    return this.api.post<any>('/creatorProfile/save', profile);
  }

  getMyCreatorProfile(): Observable<any> {
    return this.api.get<any>('/creatorProfile/me');
  }

  getCreatorProfileByUserId(userId: number): Observable<any> {
    return this.api.get<any>(`/creatorProfile/view/${userId}`);
  }

  getCreatorWithPosts(userId: number): Observable<any> {
    return this.api.get<any>(`/creatorProfile/withPosts/${userId}`);
  }

  searchByNiche(niche: string): Observable<any> {
    return this.api.get<any>(`/creatorProfile/search?niche=${niche}`);
  }

  getAllCreators(): Observable<any> {
    return this.api.get<any>('/creatorProfile/all');
  }

  deleteCreatorProfile(): Observable<any> {
    return this.api.delete<any>('/creatorProfile/delete');
  }

  updateProfilePicture(profilepicURL: string): Observable<any> {
    return this.api.put<any>('/creatorProfile/updatePic', { profilepicURL });
  }

  getVerifiedEligibility(): Observable<any> {
    return this.api.get<any>('/creatorProfile/verified-eligibility');
  }

  getCreatorAnalyticsDashboard(): Observable<any> {
    return this.api.get<any>('/creator/analytics/dashboard');
  }

  trackPostView(postId: number, payload?: { watchSeconds?: number; completed?: boolean }): Observable<any> {
    return this.api.post<any>(`/creator/analytics/track/post/${postId}`, payload || {});
  }

  trackStoryView(storyId: number, payload?: { tapThrough?: boolean }): Observable<any> {
    return this.api.post<any>(`/creator/analytics/track/story/${storyId}`, payload || {});
  }

  getMarketplaceOpportunities(category?: string): Observable<any[]> {
    const query = category ? `?category=${encodeURIComponent(category)}` : '';
    return this.api.get<any[]>(`/creator/marketplace/opportunities${query}`);
  }

  createMarketplaceOpportunity(payload: any): Observable<any> {
    return this.api.post<any>('/creator/marketplace/opportunities', payload);
  }

  applyToOpportunity(opportunityId: number, pitchMessage: string): Observable<any> {
    return this.api.post<any>(`/creator/marketplace/opportunities/${opportunityId}/apply`, { pitchMessage });
  }

  getMyMarketplaceApplications(): Observable<any[]> {
    return this.api.get<any[]>('/creator/marketplace/applications/me');
  }

  getMyBusinessMarketplaceOpportunities(): Observable<any[]> {
    return this.api.get<any[]>('/creator/marketplace/opportunities/business/me');
  }

  getApplicationsForOpportunity(opportunityId: number): Observable<any[]> {
    return this.api.get<any[]>(`/creator/marketplace/opportunities/${opportunityId}/applications`);
  }

  updateMarketplaceApplicationStatus(applicationId: number, status: 'PENDING' | 'ACCEPTED' | 'REJECTED'): Observable<any> {
    return this.api.put<any>(`/creator/marketplace/applications/${applicationId}/status`, { status });
  }

  startApplicationPromotion(applicationId: number): Observable<any> {
    return this.api.put<any>(`/creator/marketplace/applications/${applicationId}/promotion/start`, {});
  }

  completeApplicationPromotion(applicationId: number): Observable<any> {
    return this.api.put<any>(`/creator/marketplace/applications/${applicationId}/promotion/complete`, {});
  }

  requestApplicationPromotion(
    applicationId: number,
    payload: {
      promotionDetails: string;
      promotionProductImageUrl?: string;
      promotionProductLink?: string;
      promotionBusinessPostId?: number | null;
    }
  ): Observable<any> {
    return this.api.put<any>(`/creator/marketplace/applications/${applicationId}/promotion/request`, payload);
  }

  acceptApplicationPromotion(applicationId: number): Observable<any> {
    return this.api.put<any>(`/creator/marketplace/applications/${applicationId}/promotion/accept`, {});
  }

  confirmApplicationPromotion(applicationId: number, confirmationNote: string): Observable<any> {
    return this.api.put<any>(`/creator/marketplace/applications/${applicationId}/promotion/confirm`, { confirmationNote });
  }

  completeApplicationPromotionAndPay(
    applicationId: number,
    paymentAmount: number,
    paymentReference?: string
  ): Observable<any> {
    return this.api.put<any>(`/creator/marketplace/applications/${applicationId}/promotion/complete-pay`, {
      paymentAmount,
      paymentReference
    });
  }

  createPromotionPostFromApplication(
    applicationId: number,
    payload: { description?: string; hashtags?: string; mediaUrl?: string; mediaType?: string; productLink?: string }
  ): Observable<any> {
    return this.api.post<any>(`/creator/marketplace/applications/${applicationId}/promotion/create-post`, payload || {});
  }

  closeMarketplaceOpportunity(opportunityId: number): Observable<any> {
    return this.api.put<any>(`/creator/marketplace/opportunities/${opportunityId}/close`, {});
  }

  sendDirectProposal(payload: {
    creatorId?: number;
    creatorUsername?: string;
    title: string;
    message: string;
    budget?: number | null;
  }): Observable<any> {
    return this.api.post<any>('/creator/marketplace/proposals/send', payload);
  }

  getMySentDirectProposals(): Observable<any[]> {
    return this.api.get<any[]>('/creator/marketplace/proposals/sent/me');
  }

  getMyReceivedDirectProposals(): Observable<any[]> {
    return this.api.get<any[]>('/creator/marketplace/proposals/received/me');
  }

  updateDirectProposalStatus(proposalId: number, status: 'PENDING' | 'ACCEPTED' | 'REJECTED'): Observable<any> {
    return this.api.put<any>(`/creator/marketplace/proposals/${proposalId}/status`, { status });
  }

  startDirectProposalPromotion(proposalId: number): Observable<any> {
    return this.api.put<any>(`/creator/marketplace/proposals/${proposalId}/promotion/start`, {});
  }

  completeDirectProposalPromotion(proposalId: number): Observable<any> {
    return this.api.put<any>(`/creator/marketplace/proposals/${proposalId}/promotion/complete`, {});
  }

  requestDirectProposalPromotion(
    proposalId: number,
    payload: {
      promotionDetails: string;
      promotionProductImageUrl?: string;
      promotionProductLink?: string;
      promotionBusinessPostId?: number | null;
    }
  ): Observable<any> {
    return this.api.put<any>(`/creator/marketplace/proposals/${proposalId}/promotion/request`, payload);
  }

  acceptDirectProposalPromotion(proposalId: number): Observable<any> {
    return this.api.put<any>(`/creator/marketplace/proposals/${proposalId}/promotion/accept`, {});
  }

  confirmDirectProposalPromotion(proposalId: number, confirmationNote: string): Observable<any> {
    return this.api.put<any>(`/creator/marketplace/proposals/${proposalId}/promotion/confirm`, { confirmationNote });
  }

  completeDirectProposalPromotionAndPay(
    proposalId: number,
    paymentAmount: number,
    paymentReference?: string
  ): Observable<any> {
    return this.api.put<any>(`/creator/marketplace/proposals/${proposalId}/promotion/complete-pay`, {
      paymentAmount,
      paymentReference
    });
  }

  createPromotionPostFromProposal(
    proposalId: number,
    payload: { description?: string; hashtags?: string; mediaUrl?: string; mediaType?: string; productLink?: string }
  ): Observable<any> {
    return this.api.post<any>(`/creator/marketplace/proposals/${proposalId}/promotion/create-post`, payload || {});
  }

  getBusinessRoiFunnel(): Observable<any> {
    return this.api.get<any>('/creator/marketplace/analytics/business/funnel');
  }

  exportBusinessRoiFunnelCsv(): Observable<string> {
    return this.api.get<string>('/creator/marketplace/analytics/business/funnel/export', { responseType: 'text' as 'json' });
  }

  subscribeToCreator(creatorId: number): Observable<any> {
    return this.api.post<any>(`/creator/subscriptions/${creatorId}`, {});
  }

  unsubscribeFromCreator(creatorId: number): Observable<any> {
    return this.api.delete<any>(`/creator/subscriptions/${creatorId}`);
  }

  getSubscriptionStatus(creatorId: number): Observable<{ subscribed: boolean }> {
    return this.api.get<{ subscribed: boolean }>(`/creator/subscriptions/${creatorId}/status`);
  }

  getMySubscriptions(): Observable<any[]> {
    return this.api.get<any[]>('/creator/subscriptions/me');
  }
}
