import { Component, inject } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { TabbarComponent } from './components/tabbar/tabbar.component';
import { RightPanelComponent } from './components/right-panel/right-panel.component';
import { CreateModalComponent } from './components/create-modal/create-modal.component';
import { MobileTopbarComponent } from './components/mobile-topbar/mobile-topbar.component';
import { CommonModule } from '@angular/common';
import { AuthService } from './services/auth.service';
import { ThemeService } from './services/theme.service';
import { CreateModalService, CreateSubMode } from './services/create-modal.service';
import { Subscription, filter } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, TabbarComponent, RightPanelComponent, CreateModalComponent, MobileTopbarComponent, CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'revconnect-angular';
  isCreateModalOpen = false;
  createModalDefaultSubMode: CreateSubMode = 'POST';
  authService = inject(AuthService);
  themeService = inject(ThemeService);
  createModalService = inject(CreateModalService);
  router = inject(Router);
  hideLayout = false;
  private createModalSub?: Subscription;

  constructor() {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      const url = event.urlAfterRedirects;
      this.hideLayout = url === '/' ||
        url.includes('/login') ||
        url.includes('/register') ||
        url.includes('/forgot-password') ||
        url.includes('/profile-setup');
    });

    this.createModalSub = this.createModalService.openRequests$.subscribe(mode => {
      this.openCreateModal(mode);
    });
  }

  openCreateModal(mode: CreateSubMode = 'POST') {
    this.createModalDefaultSubMode = mode;
    this.isCreateModalOpen = true;
  }

  onCreateModalClosed() {
    this.isCreateModalOpen = false;
    this.createModalDefaultSubMode = 'POST';
  }
}
