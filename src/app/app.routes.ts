import { Routes } from '@angular/router';
import { LoginComponent } from './pages/auth/login/login.component';
import { ForgotPasswordComponent } from './pages/auth/forgot-password/forgot-password.component';
import { RegisterComponent } from './pages/auth/register/register.component';
import { ProfileSetupComponent } from './pages/auth/profile-setup/profile-setup.component';
import { HomeComponent } from './pages/home/home.component';
import { ExploreComponent } from './pages/explore/explore.component';
import { SearchComponent } from './pages/search/search.component';
import { MessagesComponent } from './pages/messages/messages.component';
import { NotificationsComponent } from './pages/notifications/notifications.component';
import { SettingsComponent } from './pages/settings/settings.component';
import { ProfileComponent } from './pages/profile/profile.component';
import { ProfilePreferencesComponent } from './pages/profile-preferences/profile-preferences.component';
import { CreatorAnalyticsComponent } from './pages/creator-analytics/creator-analytics.component';
import { CreatorMarketplaceComponent } from './pages/creator-marketplace/creator-marketplace.component';
import { SavedComponent } from './pages/saved/saved.component';
import { SubscriptionsComponent } from './pages/subscriptions/subscriptions.component';
import { CreatorStudioComponent } from './pages/creator-studio/creator-studio.component';
import { authGuard, loggedInGuard } from './auth.guard';
import { LandingComponent } from './pages/landing/landing.component';

export const routes: Routes = [
    // Landing Page (Public root)
    {
        path: '',
        component: LandingComponent,
        pathMatch: 'full'
    },

    // Public Routes (only for unauthenticated users)
    {
        path: 'login',
        component: LoginComponent,
        canActivate: [loggedInGuard]
    },
    {
        path: 'register',
        component: RegisterComponent,
        canActivate: [loggedInGuard]
    },
    {
        path: 'forgot-password',
        component: ForgotPasswordComponent,
        canActivate: [loggedInGuard]
    },
    {
        path: 'profile-setup',
        component: ProfileSetupComponent,
    },

    // Protected Routes
    {
        path: '',
        canActivate: [authGuard],
        children: [
            { path: 'home', component: HomeComponent },
            { path: 'explore', component: ExploreComponent },
            { path: 'search', component: SearchComponent },
            { path: 'messages', component: MessagesComponent },
            { path: 'notifications', component: NotificationsComponent },
            { path: 'settings', component: SettingsComponent },
            { path: 'creator/analytics', component: CreatorAnalyticsComponent },
            { path: 'creator/marketplace', component: CreatorMarketplaceComponent },
            { path: 'creator/studio', component: CreatorStudioComponent },
            { path: 'creator/subscriptions', component: SubscriptionsComponent },
            { path: 'saved', component: SavedComponent },
            { path: 'profile/preferences', component: ProfilePreferencesComponent },
            { path: 'profile', component: ProfileComponent },
            { path: 'profile/:username', component: ProfileComponent },
        ]
    },

    // Fallback
    { path: '**', redirectTo: '' }
];
