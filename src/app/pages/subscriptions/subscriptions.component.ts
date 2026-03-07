import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { CreatorService } from '../../services/creator.service';

@Component({
  selector: 'app-subscriptions',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './subscriptions.component.html',
  styleUrl: './subscriptions.component.css'
})
export class SubscriptionsComponent implements OnInit {
  private creatorService = inject(CreatorService);

  loading = true;
  error = '';
  subscriptions: any[] = [];

  async ngOnInit() {
    this.loading = true;
    this.error = '';
    try {
      this.subscriptions = await firstValueFrom(this.creatorService.getMySubscriptions());
    } catch (err) {
      console.error('Failed to load subscriptions', err);
      this.error = 'Unable to load subscriptions.';
    } finally {
      this.loading = false;
    }
  }
}
