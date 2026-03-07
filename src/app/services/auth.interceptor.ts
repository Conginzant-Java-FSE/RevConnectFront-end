import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
    const token = localStorage.getItem('token');
    const router = inject(Router);
    const publicAuthEndpoints = [
        '/auth/login',
        '/auth/register',
        '/auth/forgot-password/request',
        '/auth/forgot-password/verify',
        '/auth/forgot-password/reset'
    ];
    const isPublicAuthEndpoint = publicAuthEndpoints.some(endpoint => req.url.includes(endpoint));

    let clonedRequest = req;
    if (token && !isPublicAuthEndpoint) {
        clonedRequest = req.clone({
            setHeaders: {
                Authorization: `Bearer ${token}`
            }
        });
    }

    return next(clonedRequest).pipe(
        catchError((error: HttpErrorResponse) => {
            if ((error.status === 401 || error.status === 403) && !isPublicAuthEndpoint) {
                console.error('Authentication failed or token expired. Please log in again.');
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                if (router.url !== '/login' && router.url !== '/register' && router.url !== '/') {
                    router.navigate(['/login']);
                }
            }
            return throwError(() => error);
        })
    );
};