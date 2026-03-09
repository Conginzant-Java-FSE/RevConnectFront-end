import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { CreatorService } from '../../services/creator.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-creator-marketplace',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './creator-marketplace.component.html',
  styleUrl: './creator-marketplace.component.css'
})
export class CreatorMarketplaceComponent implements OnInit {
  private creatorService = inject(CreatorService);
  authService = inject(AuthService);

  loading = true;
  error = '';
  success = '';

  opportunities: any[] = [];
  myApplications: any[] = [];
  myBusinessOpportunities: any[] = [];
  mySentDirectProposals: any[] = [];
  myReceivedDirectProposals: any[] = [];
  selectedOpportunityApplications: any[] = [];
  selectedBusinessOpportunityId: number | null = null;
  businessRoiFunnel: any = null;

  showApplyModal = false;
  applyTarget: any = null;
  pitchMessage = '';
  applying = false;
  showPromotionDetailsModal = false;
  promotionTargetType: 'APPLICATION' | 'PROPOSAL' | null = null;
  promotionTargetId: number | null = null;
  promotionDetailsSubmitting = false;
  promotionDetailsForm = {
    promotionDetails: '',
    promotionProductImageUrl: '',
    promotionProductLink: '',
    promotionBusinessPostId: ''
  };
  showPaymentModal = false;
  paymentTargetType: 'APPLICATION' | 'PROPOSAL' | null = null;
  paymentTargetId: number | null = null;
  paymentSubmitting = false;
  paymentForm = {
    amount: '',
    reference: ''
  };
  showConfirmationModal = false;
  confirmationTargetType: 'APPLICATION' | 'PROPOSAL' | null = null;
  confirmationTargetId: number | null = null;
  confirmationSubmitting = false;
  confirmationNote = '';
  showPromotionPostModal = false;
  promotionPostTargetType: 'APPLICATION' | 'PROPOSAL' | null = null;
  promotionPostTargetId: number | null = null;
  promotionPostSubmitting = false;
  promotionPostForm = {
    description: '',
    hashtags: '',
    mediaUrl: '',
    productLink: ''
  };

  creatingOpportunity = false;
  sendingDirectProposal = false;
  updatingDirectProposalStatusId: number | null = null;
  promotionActionApplicationId: number | null = null;
  promotionActionProposalId: number | null = null;
  exportingRoi = false;
  opportunityForm = {
    title: '',
    description: '',
    creatorCategory: '',
    minBudget: 0,
    maxBudget: 0
  };
  directProposalForm = {
    creatorUsername: '',
    title: '',
    message: '',
    budget: 0
  };

  get role(): string {
    return this.authService.currentUser?.role || '';
  }

  get isCreator(): boolean {
    return this.role === 'CREATER';
  }

  get isBusiness(): boolean {
    return this.role === 'Business_Account_User';
  }

  async ngOnInit() {
    await this.loadAll();
  }

  async loadAll() {
    this.loading = true;
    this.error = '';
    this.success = '';
    try {
      await this.loadOpportunities();
      if (this.isCreator) {
        await this.loadMyApplications();
        await this.loadMyReceivedDirectProposals();
      }
      if (this.isBusiness) {
        await this.loadMyBusinessOpportunities();
        await this.loadMySentDirectProposals();
        await this.loadBusinessRoiFunnel();
      }
    } catch (err) {
      console.error('Failed to load marketplace', err);
      this.error = 'Failed to load marketplace data.';
    } finally {
      this.loading = false;
    }
  }

  async loadOpportunities() {
    this.opportunities = await firstValueFrom(this.creatorService.getMarketplaceOpportunities());
  }

  async loadMyApplications() {
    this.myApplications = await firstValueFrom(this.creatorService.getMyMarketplaceApplications());
  }

  async loadMyBusinessOpportunities() {
    this.myBusinessOpportunities = await firstValueFrom(this.creatorService.getMyBusinessMarketplaceOpportunities());
  }

  async loadMySentDirectProposals() {
    this.mySentDirectProposals = await firstValueFrom(this.creatorService.getMySentDirectProposals());
  }

  async loadMyReceivedDirectProposals() {
    this.myReceivedDirectProposals = await firstValueFrom(this.creatorService.getMyReceivedDirectProposals());
  }

  async loadBusinessRoiFunnel() {
    this.businessRoiFunnel = await firstValueFrom(this.creatorService.getBusinessRoiFunnel());
  }

  openApplyModal(opportunity: any) {
    this.applyTarget = opportunity;
    this.pitchMessage = '';
    this.showApplyModal = true;
  }

  closeApplyModal() {
    this.showApplyModal = false;
    this.applyTarget = null;
    this.pitchMessage = '';
  }

  async submitApplication() {
    if (!this.applyTarget?.id || !this.pitchMessage.trim()) {
      return;
    }
    this.applying = true;
    this.error = '';
    this.success = '';
    try {
      await firstValueFrom(this.creatorService.applyToOpportunity(this.applyTarget.id, this.pitchMessage.trim()));
      this.success = 'Application submitted successfully.';
      this.closeApplyModal();
      await this.loadMyApplications();
    } catch (err: any) {
      console.error('Failed to apply', err);
      this.error = err?.error?.message || err?.error || 'Failed to submit application.';
    } finally {
      this.applying = false;
    }
  }

  async submitOpportunity() {
    if (!this.isBusiness) return;
    if (!this.opportunityForm.title.trim() || !this.opportunityForm.description.trim()) {
      this.error = 'Title and description are required.';
      return;
    }

    this.creatingOpportunity = true;
    this.error = '';
    this.success = '';
    try {
      await firstValueFrom(this.creatorService.createMarketplaceOpportunity({
        title: this.opportunityForm.title.trim(),
        description: this.opportunityForm.description.trim(),
        creatorCategory: this.opportunityForm.creatorCategory.trim() || null,
        minBudget: Number(this.opportunityForm.minBudget) || 0,
        maxBudget: Number(this.opportunityForm.maxBudget) || 0
      }));
      this.success = 'Opportunity created.';
      this.opportunityForm = {
        title: '',
        description: '',
        creatorCategory: '',
        minBudget: 0,
        maxBudget: 0
      };
      await this.loadMyBusinessOpportunities();
      await this.loadOpportunities();
    } catch (err: any) {
      console.error('Failed to create opportunity', err);
      this.error = err?.error?.message || err?.error || 'Failed to create opportunity.';
    } finally {
      this.creatingOpportunity = false;
    }
  }

  async submitDirectProposal() {
    if (!this.isBusiness) return;

    const creatorUsername = this.directProposalForm.creatorUsername.trim();
    const title = this.directProposalForm.title.trim();
    const message = this.directProposalForm.message.trim();
    const budget = Number(this.directProposalForm.budget);

    if (!creatorUsername || !title || !message) {
      this.error = 'Creator username, proposal title, and message are required.';
      return;
    }

    this.sendingDirectProposal = true;
    this.error = '';
    this.success = '';
    try {
      await firstValueFrom(this.creatorService.sendDirectProposal({
        creatorUsername,
        title,
        message,
        budget: Number.isFinite(budget) && budget > 0 ? budget : null
      }));

      this.success = 'Direct proposal sent successfully.';
      this.directProposalForm = {
        creatorUsername: '',
        title: '',
        message: '',
        budget: 0
      };

      await this.loadMySentDirectProposals();
      await this.loadBusinessRoiFunnel();
    } catch (err: any) {
      console.error('Failed to send direct proposal', err);
      this.error = err?.error?.message || err?.error || 'Failed to send direct proposal.';
    } finally {
      this.sendingDirectProposal = false;
    }
  }

  async viewApplications(opportunityId: number) {
    try {
      this.selectedBusinessOpportunityId = opportunityId;
      this.selectedOpportunityApplications = await firstValueFrom(
        this.creatorService.getApplicationsForOpportunity(opportunityId)
      );
    } catch (err) {
      console.error('Failed to load opportunity applications', err);
      this.error = 'Could not load applications for this opportunity.';
    }
  }

  async updateApplicationStatus(applicationId: number, status: 'PENDING' | 'ACCEPTED' | 'REJECTED') {
    try {
      await firstValueFrom(this.creatorService.updateMarketplaceApplicationStatus(applicationId, status));
      if (this.selectedBusinessOpportunityId) {
        await this.viewApplications(this.selectedBusinessOpportunityId);
      }
      this.success = `Application marked as ${status}.`;
      await this.loadBusinessRoiFunnel();
    } catch (err) {
      console.error('Failed to update status', err);
      this.error = 'Failed to update application status.';
    }
  }

  async startApplicationPromotion(applicationId: number) {
    this.openPromotionDetailsModal('APPLICATION', applicationId);
  }

  async completeApplicationPromotion(applicationId: number) {
    this.openPaymentModal('APPLICATION', applicationId);
  }

  async acceptApplicationPromotion(applicationId: number) {
    this.promotionActionApplicationId = applicationId;
    this.error = '';
    this.success = '';
    try {
      await firstValueFrom(this.creatorService.acceptApplicationPromotion(applicationId));
      this.success = 'Promotion request accepted. You can now execute the promotion.';
      await this.loadMyApplications();
    } catch (err: any) {
      console.error('Failed to accept application promotion', err);
      this.error = err?.error?.message || err?.error || 'Failed to accept promotion request.';
    } finally {
      this.promotionActionApplicationId = null;
    }
  }

  async confirmApplicationPromotion(applicationId: number) {
    this.openConfirmationModal('APPLICATION', applicationId);
  }

  async closeOpportunity(opportunityId: number) {
    try {
      await firstValueFrom(this.creatorService.closeMarketplaceOpportunity(opportunityId));
      this.success = 'Opportunity closed.';
      await this.loadMyBusinessOpportunities();
      await this.loadOpportunities();
      if (this.selectedBusinessOpportunityId === opportunityId) {
        this.selectedOpportunityApplications = [];
      }
    } catch (err) {
      console.error('Failed to close opportunity', err);
      this.error = 'Failed to close opportunity.';
    }
  }

  async updateDirectProposalStatus(proposalId: number, status: 'PENDING' | 'ACCEPTED' | 'REJECTED') {
    if (!this.isCreator) return;
    this.updatingDirectProposalStatusId = proposalId;
    this.error = '';
    this.success = '';

    try {
      await firstValueFrom(this.creatorService.updateDirectProposalStatus(proposalId, status));
      this.success = `Direct proposal marked as ${status}.`;
      await this.loadMyReceivedDirectProposals();
      if (this.isBusiness) {
        await this.loadBusinessRoiFunnel();
      }
    } catch (err: any) {
      console.error('Failed to update direct proposal status', err);
      this.error = err?.error?.message || err?.error || 'Failed to update direct proposal status.';
    } finally {
      this.updatingDirectProposalStatusId = null;
    }
  }

  async startDirectProposalPromotion(proposalId: number) {
    if (!this.isBusiness) return;
    this.openPromotionDetailsModal('PROPOSAL', proposalId);
  }

  async completeDirectProposalPromotion(proposalId: number) {
    if (!this.isBusiness) return;
    this.openPaymentModal('PROPOSAL', proposalId);
  }

  async acceptDirectProposalPromotion(proposalId: number) {
    if (!this.isCreator) return;
    this.promotionActionProposalId = proposalId;
    this.error = '';
    this.success = '';

    try {
      await firstValueFrom(this.creatorService.acceptDirectProposalPromotion(proposalId));
      this.success = 'Promotion request accepted. You can now execute the promotion.';
      await this.loadMyReceivedDirectProposals();
    } catch (err: any) {
      console.error('Failed to accept direct promotion request', err);
      this.error = err?.error?.message || err?.error || 'Failed to accept promotion request.';
    } finally {
      this.promotionActionProposalId = null;
    }
  }

  async confirmDirectProposalPromotion(proposalId: number) {
    if (!this.isCreator) return;
    this.openConfirmationModal('PROPOSAL', proposalId);
  }

  async createPromotionPostFromApplication(application: any) {
    this.openPromotionPostModal('APPLICATION', application);
  }

  async createPromotionPostFromProposal(proposal: any) {
    this.openPromotionPostModal('PROPOSAL', proposal);
  }

  async exportRoiCsv() {
    if (!this.isBusiness) return;

    this.exportingRoi = true;
    this.error = '';
    try {
      const csvData = await firstValueFrom(this.creatorService.exportBusinessRoiFunnelCsv());
      const blob = new Blob([csvData || ''], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `business_roi_funnel_${new Date().toISOString().slice(0, 10)}.csv`;
      anchor.click();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Failed to export ROI CSV', err);
      this.error = err?.error?.message || err?.error || 'Failed to export ROI CSV.';
    } finally {
      this.exportingRoi = false;
    }
  }

  trackByOpportunity(index: number, item: any): number {
    return item?.id || index;
  }

  trackByApplication(index: number, item: any): number {
    return item?.id || index;
  }

  trackByProposal(index: number, item: any): number {
    return item?.id || index;
  }

  isDataImageUrl(url: string | null | undefined): boolean {
    const value = (url || '').trim().toLowerCase();
    return value.startsWith('data:image/');
  }

  openPromotionDetailsModal(type: 'APPLICATION' | 'PROPOSAL', targetId: number) {
    this.promotionTargetType = type;
    this.promotionTargetId = targetId;
    this.promotionDetailsForm = {
      promotionDetails: '',
      promotionProductImageUrl: '',
      promotionProductLink: '',
      promotionBusinessPostId: ''
    };
    this.showPromotionDetailsModal = true;
  }

  closePromotionDetailsModal() {
    this.showPromotionDetailsModal = false;
    this.promotionTargetType = null;
    this.promotionTargetId = null;
    this.promotionDetailsSubmitting = false;
  }

  async submitPromotionDetails() {
    if (!this.showPromotionDetailsModal || !this.promotionTargetType || !this.promotionTargetId) {
      return;
    }

    const details = this.promotionDetailsForm.promotionDetails.trim();
    if (!details) {
      this.error = 'Promotion details are required.';
      return;
    }

    const payload = {
      promotionDetails: details,
      promotionProductImageUrl: this.promotionDetailsForm.promotionProductImageUrl.trim() || undefined,
      promotionProductLink: this.promotionDetailsForm.promotionProductLink.trim() || undefined,
      promotionBusinessPostId: this.promotionDetailsForm.promotionBusinessPostId.trim()
        ? Number(this.promotionDetailsForm.promotionBusinessPostId.trim())
        : null
    };

    this.promotionDetailsSubmitting = true;
    this.error = '';
    this.success = '';
    try {
      if (this.promotionTargetType === 'APPLICATION') {
        this.promotionActionApplicationId = this.promotionTargetId;
        await firstValueFrom(this.creatorService.requestApplicationPromotion(this.promotionTargetId, payload));
        this.success = 'Promotion details sent to creator.';
        if (this.selectedBusinessOpportunityId) {
          await this.viewApplications(this.selectedBusinessOpportunityId);
        }
        await this.loadMyBusinessOpportunities();
      } else {
        this.promotionActionProposalId = this.promotionTargetId;
        await firstValueFrom(this.creatorService.requestDirectProposalPromotion(this.promotionTargetId, payload));
        this.success = 'Promotion details sent to creator.';
        await this.loadMySentDirectProposals();
      }
      await this.loadBusinessRoiFunnel();
      this.closePromotionDetailsModal();
    } catch (err: any) {
      console.error('Failed to send promotion details', err);
      this.error = err?.error?.message || err?.error || 'Failed to send promotion details.';
    } finally {
      this.promotionActionApplicationId = null;
      this.promotionActionProposalId = null;
      this.promotionDetailsSubmitting = false;
    }
  }

  async onPromotionImageFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      return;
    }
    const file = input.files[0];
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result || '').toString());
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    this.promotionDetailsForm.promotionProductImageUrl = base64;
  }

  openPaymentModal(type: 'APPLICATION' | 'PROPOSAL', targetId: number) {
    this.paymentTargetType = type;
    this.paymentTargetId = targetId;
    this.paymentForm = { amount: '', reference: '' };
    this.showPaymentModal = true;
  }

  closePaymentModal() {
    this.showPaymentModal = false;
    this.paymentTargetType = null;
    this.paymentTargetId = null;
    this.paymentSubmitting = false;
  }

  async submitPaymentModal() {
    if (!this.paymentTargetType || !this.paymentTargetId) {
      return;
    }
    const paymentAmount = Number(this.paymentForm.amount);
    if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
      this.error = 'Valid payment amount is required.';
      return;
    }

    this.paymentSubmitting = true;
    this.error = '';
    this.success = '';
    try {
      if (this.paymentTargetType === 'APPLICATION') {
        this.promotionActionApplicationId = this.paymentTargetId;
        await firstValueFrom(this.creatorService.completeApplicationPromotionAndPay(
          this.paymentTargetId,
          paymentAmount,
          this.paymentForm.reference.trim()
        ));
        this.success = 'Application marked completed and payment done.';
        if (this.selectedBusinessOpportunityId) {
          await this.viewApplications(this.selectedBusinessOpportunityId);
        }
        await this.loadMyBusinessOpportunities();
      } else {
        this.promotionActionProposalId = this.paymentTargetId;
        await firstValueFrom(this.creatorService.completeDirectProposalPromotionAndPay(
          this.paymentTargetId,
          paymentAmount,
          this.paymentForm.reference.trim()
        ));
        this.success = 'Direct proposal marked completed and payment done.';
        await this.loadMySentDirectProposals();
      }
      await this.loadBusinessRoiFunnel();
      this.closePaymentModal();
    } catch (err: any) {
      console.error('Failed to submit payment', err);
      this.error = err?.error?.message || err?.error || 'Failed to complete payment.';
    } finally {
      this.promotionActionApplicationId = null;
      this.promotionActionProposalId = null;
      this.paymentSubmitting = false;
    }
  }

  openConfirmationModal(type: 'APPLICATION' | 'PROPOSAL', targetId: number) {
    this.confirmationTargetType = type;
    this.confirmationTargetId = targetId;
    this.confirmationNote = '';
    this.showConfirmationModal = true;
  }

  closeConfirmationModal() {
    this.showConfirmationModal = false;
    this.confirmationTargetType = null;
    this.confirmationTargetId = null;
    this.confirmationSubmitting = false;
  }

  async submitConfirmationModal() {
    if (!this.confirmationTargetType || !this.confirmationTargetId) {
      return;
    }
    const note = this.confirmationNote.trim();
    if (!note) {
      this.error = 'Confirmation note is required.';
      return;
    }

    this.confirmationSubmitting = true;
    this.error = '';
    this.success = '';
    try {
      if (this.confirmationTargetType === 'APPLICATION') {
        this.promotionActionApplicationId = this.confirmationTargetId;
        await firstValueFrom(this.creatorService.confirmApplicationPromotion(this.confirmationTargetId, note));
        this.success = 'Completion confirmation sent to business.';
        await this.loadMyApplications();
      } else {
        this.promotionActionProposalId = this.confirmationTargetId;
        await firstValueFrom(this.creatorService.confirmDirectProposalPromotion(this.confirmationTargetId, note));
        this.success = 'Completion confirmation sent to business.';
        await this.loadMyReceivedDirectProposals();
      }
      this.closeConfirmationModal();
    } catch (err: any) {
      console.error('Failed to send confirmation', err);
      this.error = err?.error?.message || err?.error || 'Failed to send completion confirmation.';
    } finally {
      this.promotionActionApplicationId = null;
      this.promotionActionProposalId = null;
      this.confirmationSubmitting = false;
    }
  }

  openPromotionPostModal(type: 'APPLICATION' | 'PROPOSAL', source: any) {
    this.promotionPostTargetType = type;
    this.promotionPostTargetId = Number(source?.id) || null;
    this.promotionPostForm = {
      description: (source?.promotionDetails || '').toString(),
      hashtags: '',
      mediaUrl: (source?.promotionProductImageUrl || '').toString(),
      productLink: (source?.promotionProductLink || '').toString()
    };
    this.showPromotionPostModal = true;
  }

  closePromotionPostModal() {
    this.showPromotionPostModal = false;
    this.promotionPostTargetType = null;
    this.promotionPostTargetId = null;
    this.promotionPostSubmitting = false;
  }

  async submitPromotionPostModal() {
    if (!this.promotionPostTargetType || !this.promotionPostTargetId) {
      return;
    }

    this.promotionPostSubmitting = true;
    this.error = '';
    this.success = '';
    try {
      const payload = {
        description: this.promotionPostForm.description.trim() || undefined,
        hashtags: this.promotionPostForm.hashtags.trim() || undefined,
        mediaUrl: this.promotionPostForm.mediaUrl.trim() || undefined,
        mediaType: this.promotionPostForm.mediaUrl.trim() ? 'IMAGE' : undefined,
        productLink: this.promotionPostForm.productLink.trim() || undefined
      };

      if (this.promotionPostTargetType === 'APPLICATION') {
        this.promotionActionApplicationId = this.promotionPostTargetId;
        const res = await firstValueFrom(this.creatorService.createPromotionPostFromApplication(this.promotionPostTargetId, payload));
        this.success = `Promotion post created (Post ID: ${res?.postId ?? 'new'}).`;
        await this.loadMyApplications();
      } else {
        this.promotionActionProposalId = this.promotionPostTargetId;
        const res = await firstValueFrom(this.creatorService.createPromotionPostFromProposal(this.promotionPostTargetId, payload));
        this.success = `Promotion post created (Post ID: ${res?.postId ?? 'new'}).`;
        await this.loadMyReceivedDirectProposals();
      }

      this.closePromotionPostModal();
    } catch (err: any) {
      console.error('Failed to create promotion post', err);
      this.error = err?.error?.message || err?.error || 'Failed to create promotion post.';
    } finally {
      this.promotionActionApplicationId = null;
      this.promotionActionProposalId = null;
      this.promotionPostSubmitting = false;
    }
  }
}
