import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { DefaultPageService, ThemeService } from '@mockoto-ui/core';

@Component({
  selector: 'mk-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <header class="flex h-14 shrink-0 items-center justify-between border-b border-gray-200 bg-white/90 px-5 backdrop-blur-md dark:border-border dark:bg-surface/80">

      <!-- Logo — always navigates to /projects -->
      <a
        routerLink="/projects"
        class="flex items-center gap-2.5 rounded-lg transition-opacity hover:opacity-80"
        aria-label="Go to projects"
      >
        <svg viewBox="0 0 48 48" fill="none" class="h-7 w-7 shrink-0 select-none" xmlns="http://www.w3.org/2000/svg">
          <g stroke="#7070EC" stroke-width="2.6" stroke-linecap="round">
            <line x1="7" y1="7" x2="7" y2="41"/>
            <line x1="7" y1="7" x2="24" y2="28"/>
            <line x1="41" y1="7" x2="24" y2="28"/>
            <line x1="41" y1="7" x2="41" y2="41"/>
          </g>
          <line x1="7" y1="41" x2="41" y2="41" stroke="#7070EC" stroke-width="1.4" stroke-linecap="round" stroke-opacity="0.22"/>
          <circle cx="7" cy="7" r="3.5" fill="#7070EC"/>
          <circle cx="7" cy="41" r="3.5" fill="#7070EC"/>
          <circle cx="24" cy="28" r="5" fill="#9A9AFA"/>
          <circle cx="41" cy="7" r="3.5" fill="#7070EC"/>
          <circle cx="41" cy="41" r="3.5" fill="#7070EC"/>
        </svg>
        <span class="text-sm font-semibold tracking-tight text-gray-900 dark:text-zinc-100">mockoto</span>
      </a>

      <!-- Actions -->
      <div class="flex items-center gap-1">

        <!-- Go to default page — only visible when a default is pinned -->
        @if (defaultUrl()) {
          <button
            type="button"
            (click)="goToDefault()"
            title="Go to default page"
            class="flex h-8 w-8 items-center justify-center rounded-lg text-accent transition-colors hover:bg-accent/10"
            aria-label="Go to default page"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
                 fill="none" stroke="currentColor" stroke-width="2"
                 stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" x2="12" y1="17" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/>
            </svg>
          </button>
        }

        <a
          routerLink="/home"
          routerLinkActive="!text-accent"
          [routerLinkActiveOptions]="{ exact: true }"
          class="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-zinc-500 dark:hover:bg-surface dark:hover:text-zinc-300"
          aria-label="Home"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
        </a>
        <a
          routerLink="/home/cli"
          routerLinkActive="!text-accent"
          [routerLinkActiveOptions]="{ exact: true }"
          class="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-zinc-500 dark:hover:bg-surface dark:hover:text-zinc-300"
          aria-label="CLI reference"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="4 17 10 11 4 5"/><line x1="12" x2="20" y1="19" y2="19"/>
          </svg>
        </a>
        <button
          type="button"
          (click)="toggleTheme()"
          class="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-zinc-500 dark:hover:bg-surface dark:hover:text-zinc-300"
          [attr.aria-label]="isDark() ? 'Switch to light mode' : 'Switch to dark mode'"
        >
          @if (isDark()) {
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>
            </svg>
          } @else {
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
            </svg>
          }
        </button>
      </div>
    </header>
  `,
})
export class HeaderComponent {
  private readonly themeService   = inject(ThemeService);
  private readonly defaultPageSvc = inject(DefaultPageService);

  protected readonly isDark      = computed(() => this.themeService.theme() === 'dark');
  protected readonly defaultUrl  = this.defaultPageSvc.pinnedUrl;

  protected toggleTheme():   void { this.themeService.toggle(); }
  protected goToDefault():   void { this.defaultPageSvc.restoreOnStartup(); }
}
