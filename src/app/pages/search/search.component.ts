import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { firstValueFrom } from 'rxjs';
import { Subject, Subscription, debounceTime, distinctUntilChanged } from 'rxjs';

interface RecentSearchItem {
  type: 'query' | 'account';
  value: string;
  username?: string;
  role?: string;
  profilePic?: string;
  searchedAt: string;
}

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './search.component.html',
  styleUrl: './search.component.css'
})
export class SearchComponent implements OnInit, OnDestroy {
  query = '';
  results: any[] = [];
  loading = false;
  recentSearches: RecentSearchItem[] = [];

  private searchSubject = new Subject<string>();
  private searchSubscription?: Subscription;
  private readonly maxRecentItems = 12;

  api = inject(ApiService);
  router = inject(Router);
  authService = inject(AuthService);

  ngOnInit() {
    this.loadRecentSearches();
    this.searchSubscription = this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(searchTerm => {
      this.fetchResults(searchTerm);
    });
  }

  ngOnDestroy() {
    this.searchSubscription?.unsubscribe();
  }

  onSearchChange(newValue: string) {
    this.query = newValue;
    this.searchSubject.next(newValue);
  }

  async fetchResults(searchTerm: string) {
    if (!searchTerm.trim()) {
      this.results = [];
      return;
    }

    this.loading = true;
    try {
      const res = await firstValueFrom(this.api.get<any[]>(`/auth/search?query=${searchTerm}`));
      this.results = res || [];
      this.addRecentQuery(searchTerm);
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      this.loading = false;
    }
  }

  goToProfile(username: string, account?: any) {
    if (!username) {
      return;
    }
    this.addRecentAccount(account || { username });
    this.router.navigate([`/profile`, username]);
  }

  applyRecentSearch(item: RecentSearchItem) {
    if (item.type === 'account' && item.username) {
      this.goToProfile(item.username, item);
      return;
    }

    this.query = item.value;
    this.searchSubject.next(item.value);
  }

  clearRecentSearches() {
    this.recentSearches = [];
    localStorage.removeItem(this.recentStorageKey());
  }

  getProfilePic(user: any): string {
    return user?.userProfile?.profilepicURL
      || user?.creatorProfile?.profilepicURL
      || user?.businessProfile?.logoUrl
      || '';
  }

  private addRecentQuery(rawQuery: string) {
    const query = rawQuery.trim();
    if (query.length < 2 || query !== this.query.trim()) {
      return;
    }

    const item: RecentSearchItem = {
      type: 'query',
      value: query,
      searchedAt: new Date().toISOString()
    };
    this.upsertRecentItem(item);
  }

  private addRecentAccount(account: any) {
    const username = account?.username?.toString().trim();
    if (!username) {
      return;
    }

    const item: RecentSearchItem = {
      type: 'account',
      value: username,
      username,
      role: account?.role || '',
      profilePic: this.getProfilePic(account) || account?.profilePic || '',
      searchedAt: new Date().toISOString()
    };
    this.upsertRecentItem(item);
  }

  private upsertRecentItem(item: RecentSearchItem) {
    const deduped = this.recentSearches.filter(existing => {
      if (item.type !== existing.type) return true;
      if (item.type === 'query') return existing.value.toLowerCase() !== item.value.toLowerCase();
      return (existing.username || '').toLowerCase() !== (item.username || '').toLowerCase();
    });

    this.recentSearches = [item, ...deduped].slice(0, this.maxRecentItems);
    this.persistRecentSearches();
  }

  private loadRecentSearches() {
    try {
      const raw = localStorage.getItem(this.recentStorageKey());
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;
      this.recentSearches = parsed
        .filter(item => item && typeof item.value === 'string' && typeof item.type === 'string')
        .slice(0, this.maxRecentItems);
    } catch {
      this.recentSearches = [];
    }
  }

  private persistRecentSearches() {
    localStorage.setItem(this.recentStorageKey(), JSON.stringify(this.recentSearches));
  }

  private recentStorageKey() {
    const username = this.authService.currentUser?.username || 'guest';
    return `revconnect_recent_searches_${username}`;
  }
}
