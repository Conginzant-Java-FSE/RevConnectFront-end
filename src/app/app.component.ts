import { Component, inject } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { TabbarComponent } from './components/tabbar/tabbar.component';
import { RightPanelComponent } from './components/right-panel/right-panel.component';
import { CreateModalComponent } from './components/create-modal/create-modal.component';
import { CommonModule } from '@angular/common';
import { AuthService } from './services/auth.service';
import { ThemeService } from './services/theme.service';
import { filter } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, TabbarComponent, RightPanelComponent, CreateModalComponent, CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'revconnect-angular';
  isCreateModalOpen = false;
  authService = inject(AuthService);
  themeService = inject(ThemeService);
  router = inject(Router);
  hideLayout = false;

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
  }

  openCreateModal() {
    this.isCreateModalOpen = true;
  }
}
