import { inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';

const STORAGE_KEY = 'mockoto.defaultPage';

@Injectable({ providedIn: 'root' })
export class DefaultPageService {
  private readonly router = inject(Router);

  /** The currently pinned URL, or null if none is set. */
  readonly pinnedUrl = signal<string | null>(localStorage.getItem(STORAGE_KEY));

  /** Pin the current URL as the default page (full URL including query params). */
  pin(): void {
    const url = this.router.url;
    localStorage.setItem(STORAGE_KEY, url);
    this.pinnedUrl.set(url);
  }

  /** Remove the pinned default page. */
  unpin(): void {
    localStorage.removeItem(STORAGE_KEY);
    this.pinnedUrl.set(null);
  }

  /** Navigate to the pinned page if one is set. Called once at app startup. */
  restoreOnStartup(): void {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      this.router.navigateByUrl(saved, { replaceUrl: true });
    }
  }
}
