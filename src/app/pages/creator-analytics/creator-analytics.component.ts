import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { CreatorService } from '../../services/creator.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-creator-analytics',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './creator-analytics.component.html',
  styleUrl: './creator-analytics.component.css'
})
export class CreatorAnalyticsComponent implements OnInit {
  private creatorService = inject(CreatorService);
  authService = inject(AuthService);

  loading = true;
  error = '';
  dashboard: any = null;

  async ngOnInit() {
    if (this.authService.currentUser?.role !== 'CREATER') {
      this.loading = false;
      this.error = 'Creator analytics is available only for creator accounts.';
      return;
    }

    try {
      this.dashboard = await firstValueFrom(this.creatorService.getCreatorAnalyticsDashboard());
    } catch (err) {
      console.error('Failed to load creator analytics dashboard', err);
      this.error = 'Unable to load analytics right now.';
    } finally {
      this.loading = false;
    }
  }

  get postMetrics(): any[] {
    return this.dashboard?.postLevelMetrics || [];
  }

  get followerDemographics(): any {
    return this.dashboard?.followerDemographics || {};
  }

  get storyMetrics(): any {
    return this.dashboard?.storyMetrics || {};
  }

  get reelMetrics(): any {
    return this.dashboard?.reelMetrics || {};
  }

  get bestTimeToPost(): any {
    return this.dashboard?.bestTimeToPost || {};
  }

  get followerGrowthPoints(): any[] {
    return this.dashboard?.followerGrowth?.points || [];
  }

  get totalImpressions(): number {
    return this.postMetrics.reduce((sum, item) => sum + (item.impressions || 0), 0);
  }

  get totalReach(): number {
    return this.postMetrics.reduce((sum, item) => sum + (item.reach || 0), 0);
  }

  get totalSaves(): number {
    return this.postMetrics.reduce((sum, item) => sum + (item.saves || 0), 0);
  }

  get totalWatchTime(): number {
    return this.postMetrics.reduce((sum, item) => sum + (item.watchTimeSeconds || 0), 0);
  }

  get ageDistributionRows(): Array<{ label: string; value: number }> {
    const age = this.followerDemographics?.age || {};
    return Object.keys(age).map(label => ({ label, value: Number(age[label] || 0) }));
  }

  get genderDistributionRows(): Array<{ label: string; value: number }> {
    const gender = this.followerDemographics?.gender || {};
    return Object.keys(gender).map(label => ({ label, value: Number(gender[label] || 0) }));
  }

  get highestGrowthValue(): number {
    return this.followerGrowthPoints.reduce((max, point) => Math.max(max, Number(point.followers || 0)), 0);
  }

  trackByPost(index: number, item: any): number {
    return item?.postId || index;
  }

  trackByDate(index: number, item: any): string {
    return item?.date || `${index}`;
  }

  asBarWidth(value: number, max: number): string {
    if (!max || max <= 0) {
      return '0%';
    }
    const pct = Math.max(0, Math.min(100, (value / max) * 100));
    return `${pct}%`;
  }

  asSafePercent(value: number): number {
    if (!Number.isFinite(value)) {
      return 0;
    }
    return Math.max(0, Math.min(100, value));
  }
}
