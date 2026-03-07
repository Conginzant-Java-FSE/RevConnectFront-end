import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { BusinessProfile } from '../models/user.model';
import { Product, ProductPayload } from '../models/product.model';

@Injectable({ providedIn: 'root' })
export class BusinessService {
  private api = inject(ApiService);

  // Business Profile
  getBusinessProfile(): Observable<any> {
    return this.api.get<any>('/business/profile');
  }

  createOrUpdateBusinessProfile(profile: Partial<BusinessProfile>): Observable<any> {
    return this.api.post<any>('/business/profile', profile);
  }

  deleteBusinessProfile(): Observable<any> {
    return this.api.delete<any>('/business/profile');
  }

  updateProfilePicture(logoUrl: string): Observable<any> {
    return this.api.put<any>('/business/profile/updatePic', { logoUrl });
  }

  // Products
  getProducts(): Observable<Product[]> {
    return this.api.get<Product[]>('/business/products');
  }

  getProductsByUserId(userId: number): Observable<Product[]> {
    return this.api.get<Product[]>(`/business/products/user/${userId}`);
  }

  addProduct(product: ProductPayload): Observable<Product> {
    return this.api.post<Product>('/business/products', product);
  }

  updateProduct(id: number, product: ProductPayload): Observable<Product> {
    return this.api.put<Product>(`/business/products/${id}`, product);
  }

  deleteProduct(id: number): Observable<string> {
    return this.api.delete<string>(`/business/products/${id}`, { responseType: 'text' as 'json' });
  }

  // Analytics
  getAnalyticsDashboard(): Observable<any> {
    return this.api.get<any>('/business/analytics');
  }

  // Reviews
  addReview(businessUserId: number, rating: number, comment: string): Observable<any> {
    return this.api.post<any>(`/reviews/${businessUserId}?rating=${rating}&comment=${encodeURIComponent(comment)}`);
  }

  getMyBusinessReviews(): Observable<any> {
    return this.api.get<any>('/reviews');
  }

  deleteReview(reviewId: number): Observable<any> {
    return this.api.delete<any>(`/reviews/${reviewId}`);
  }
}
