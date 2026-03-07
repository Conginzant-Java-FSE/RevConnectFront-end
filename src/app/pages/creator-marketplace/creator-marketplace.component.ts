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
    const promotionDetails = prompt('Enter promotion details/instructions for creator:')?.trim();
    if (!promotionDetails) {
      return;
    }
    const promotionProductImageUrl = prompt('Enter product image URL (optional):')?.trim() || '';
    const promotionProductLink = prompt('Enter product buy link URL (optional):')?.trim() || '';
    const promotionBusinessPostIdInput = prompt('Enter business post ID to promote (optional):')?.trim() || '';
    const promotionBusinessPostId = promotionBusinessPostIdInput ? Number(promotionBusinessPostIdInput) : null;

    this.promotionActionApplicationId = applicationId;
    this.error = '';
    this.success = '';
    try {
      await firstValueFrom(this.creatorService.requestApplicationPromotion(applicationId, {
        promotionDetails,
        promotionProductImageUrl: promotionProductImageUrl || undefined,
        promotionProductLink: promotionProductLink || undefined,
        promotionBusinessPostId: Number.isFinite(Number(promotionBusinessPostId)) ? Number(promotionBusinessPostId) : null
      }));
      this.success = 'Promotion request sent to creator.';
      if (this.selectedBusinessOpportunityId) {
        await this.viewApplications(this.selectedBusinessOpportunityId);
      }
      await this.loadMyBusinessOpportunities();
      await this.loadBusinessRoiFunnel();
    } catch (err: any) {
      console.error('Failed to start application promotion', err);
      this.error = err?.error?.message || err?.error || 'Failed to start promotion for application.';
    } finally {
      this.promotionActionApplicationId = null;
    }
  }

  async completeApplicationPromotion(applicationId: number) {
    const amountInput = prompt('Enter payment amount (required):');
    const paymentAmount = Number(amountInput);
    if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
      this.error = 'Valid payment amount is required.';
      return;
    }
    const paymentReference = prompt('Enter payment reference/transaction id (optional):')?.trim() || '';

    this.promotionActionApplicationId = applicationId;
    this.error = '';
    this.success = '';
    try {
      await firstValueFrom(this.creatorService.completeApplicationPromotionAndPay(applicationId, paymentAmount, paymentReference));
      this.success = 'Application marked completed and payment done.';
      if (this.selectedBusinessOpportunityId) {
        await this.viewApplications(this.selectedBusinessOpportunityId);
      }
      await this.loadMyBusinessOpportunities();
      await this.loadBusinessRoiFunnel();
    } catch (err: any) {
      console.error('Failed to complete application promotion', err);
      this.error = err?.error?.message || err?.error || 'Failed to complete promotion for application.';
    } finally {
      this.promotionActionApplicationId = null;
    }
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
    const confirmationNote = prompt('Enter completion confirmation note for business:')?.trim();
    if (!confirmationNote) {
      return;
    }

    this.promotionActionApplicationId = applicationId;
    this.error = '';
    this.success = '';
    try {
      await firstValueFrom(this.creatorService.confirmApplicationPromotion(applicationId, confirmationNote));
      this.success = 'Completion confirmation sent to business.';
      await this.loadMyApplications();
    } catch (err: any) {
      console.error('Failed to confirm application promotion', err);
      this.error = err?.error?.message || err?.error || 'Failed to send completion confirmation.';
    } finally {
      this.promotionActionApplicationId = null;
    }
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
    const promotionDetails = prompt('Enter promotion details/instructions for creator:')?.trim();
    if (!promotionDetails) {
      return;
    }
    const promotionProductImageUrl = prompt('Enter product image URL (optional):')?.trim() || '';
    const promotionProductLink = prompt('Enter product buy link URL (optional):')?.trim() || '';
    const promotionBusinessPostIdInput = prompt('Enter business post ID to promote (optional):')?.trim() || '';
    const promotionBusinessPostId = promotionBusinessPostIdInput ? Number(promotionBusinessPostIdInput) : null;

    this.promotionActionProposalId = proposalId;
    this.error = '';
    this.success = '';

    try {
      await firstValueFrom(this.creatorService.requestDirectProposalPromotion(proposalId, {
        promotionDetails,
        promotionProductImageUrl: promotionProductImageUrl || undefined,
        promotionProductLink: promotionProductLink || undefined,
        promotionBusinessPostId: Number.isFinite(Number(promotionBusinessPostId)) ? Number(promotionBusinessPostId) : null
      }));
      this.success = 'Promotion request sent to creator.';
      await this.loadMySentDirectProposals();
      await this.loadBusinessRoiFunnel();
    } catch (err: any) {
      console.error('Failed to start direct proposal promotion', err);
      this.error = err?.error?.message || err?.error || 'Failed to start promotion for direct proposal.';
    } finally {
      this.promotionActionProposalId = null;
    }
  }

  async completeDirectProposalPromotion(proposalId: number) {
    if (!this.isBusiness) return;
    const amountInput = prompt('Enter payment amount (required):');
    const paymentAmount = Number(amountInput);
    if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
      this.error = 'Valid payment amount is required.';
      return;
    }
    const paymentReference = prompt('Enter payment reference/transaction id (optional):')?.trim() || '';

    this.promotionActionProposalId = proposalId;
    this.error = '';
    this.success = '';

    try {
      await firstValueFrom(this.creatorService.completeDirectProposalPromotionAndPay(proposalId, paymentAmount, paymentReference));
      this.success = 'Direct proposal marked completed and payment done.';
      await this.loadMySentDirectProposals();
      await this.loadBusinessRoiFunnel();
    } catch (err: any) {
      console.error('Failed to complete direct proposal promotion', err);
      this.error = err?.error?.message || err?.error || 'Failed to complete promotion for direct proposal.';
    } finally {
      this.promotionActionProposalId = null;
    }
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
    const confirmationNote = prompt('Enter completion confirmation note for business:')?.trim();
    if (!confirmationNote) {
      return;
    }

    this.promotionActionProposalId = proposalId;
    this.error = '';
    this.success = '';

    try {
      await firstValueFrom(this.creatorService.confirmDirectProposalPromotion(proposalId, confirmationNote));
      this.success = 'Completion confirmation sent to business.';
      await this.loadMyReceivedDirectProposals();
    } catch (err: any) {
      console.error('Failed to confirm direct promotion completion', err);
      this.error = err?.error?.message || err?.error || 'Failed to send completion confirmation.';
    } finally {
      this.promotionActionProposalId = null;
    }
  }

  async createPromotionPostFromApplication(application: any) {
    const description = prompt('Enter caption for your promotion post (optional):')?.trim() || '';
    const hashtags = prompt('Enter hashtags (optional):')?.trim() || '';
    const mediaUrl = prompt('Enter media URL (leave empty to use business-provided image):')?.trim() || '';
    const productLink = prompt('Enter product buy link (leave empty to use business link):')?.trim() || '';

    this.promotionActionApplicationId = application?.id ?? null;
    this.error = '';
    this.success = '';
    try {
      const res = await firstValueFrom(this.creatorService.createPromotionPostFromApplication(application.id, {
        description: description || undefined,
        hashtags: hashtags || undefined,
        mediaUrl: mediaUrl || undefined,
        mediaType: mediaUrl ? 'IMAGE' : undefined,
        productLink: productLink || undefined
      }));
      this.success = `Promotion post created (Post ID: ${res?.postId ?? 'new'}).`;
      await this.loadMyApplications();
    } catch (err: any) {
      console.error('Failed to create promotion post from application', err);
      this.error = err?.error?.message || err?.error || 'Failed to create promotion post.';
    } finally {
      this.promotionActionApplicationId = null;
    }
  }

  async createPromotionPostFromProposal(proposal: any) {
    const description = prompt('Enter caption for your promotion post (optional):')?.trim() || '';
    const hashtags = prompt('Enter hashtags (optional):')?.trim() || '';
    const mediaUrl = prompt('Enter media URL (leave empty to use business-provided image):')?.trim() || '';
    const productLink = prompt('Enter product buy link (leave empty to use business link):')?.trim() || '';

    this.promotionActionProposalId = proposal?.id ?? null;
    this.error = '';
    this.success = '';
    try {
      const res = await firstValueFrom(this.creatorService.createPromotionPostFromProposal(proposal.id, {
        description: description || undefined,
        hashtags: hashtags || undefined,
        mediaUrl: mediaUrl || undefined,
        mediaType: mediaUrl ? 'IMAGE' : undefined,
        productLink: productLink || undefined
      }));
      this.success = `Promotion post created (Post ID: ${res?.postId ?? 'new'}).`;
      await this.loadMyReceivedDirectProposals();
    } catch (err: any) {
      console.error('Failed to create promotion post from proposal', err);
      this.error = err?.error?.message || err?.error || 'Failed to create promotion post.';
    } finally {
      this.promotionActionProposalId = null;
    }
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
}
