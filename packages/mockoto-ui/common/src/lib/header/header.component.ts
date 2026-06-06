import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ThemeService } from '@mockoto-ui/core';

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
        <div class="flex h-7 w-7 select-none items-center justify-center rounded-lg bg-accent text-xs font-semibold text-white">
          mk
        </div>
        <span class="text-sm font-semibold tracking-tight text-gray-900 dark:text-zinc-100">mockoto</span>
      </a>

      <!-- Actions -->
      <div class="flex items-center gap-1">
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
  private readonly themeService = inject(ThemeService);
  protected readonly isDark = computed(() => this.themeService.theme() === 'dark');
  protected toggleTheme(): void { this.themeService.toggle(); }
}
