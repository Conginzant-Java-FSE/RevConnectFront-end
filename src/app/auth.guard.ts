import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './services/auth.service';

const hasProfileSetup = (user: any) => {
    if (!user) return false;
    if (user.role === 'USER') return !!user.userProfile;
    if (user.role === 'CREATER') return !!user.creatorProfile;
    if (user.role === 'Business_Account_User') return !!user.businessProfile;
    return true; // default
};

export const authGuard: CanActivateFn = (route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (authService.isAuthenticated) {
        if (!hasProfileSetup(authService.currentUser)) {
            router.navigate(['/profile-setup']);
            return false;
        }
        return true;
    } else {
        router.navigate(['/login']);
        return false;
    }
};

export const loggedInGuard: CanActivateFn = (route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (authService.isAuthenticated) {
        router.navigate(['/home']);
        return false;
    } else {
        return true;
    }
};
