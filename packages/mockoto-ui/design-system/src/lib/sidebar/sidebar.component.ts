import {
  Component,
  computed,
  effect,
  HostListener,
  input,
  model,
} from '@angular/core';

@Component({
  selector: 'mk-sidebar',
  standalone: true,
  host: { class: 'flex shrink-0 flex-col overflow-hidden border-r border-gray-200 transition-[width] duration-200 ease-in-out dark:border-border', '[style.width]': 'sidebarWidth()' },
  template: `
    <!-- Header: projected content + fixed toggle button -->
    <div class="flex h-10 shrink-0 items-center border-b border-gray-100 px-2 dark:border-border">
      <div class="flex flex-1 items-center overflow-hidden">
        <ng-content select="[mkSidebarHeader]" />
      </div>
      <button
        type="button"
        (click)="toggle()"
        [title]="toggleTitle()"
        aria-label="Toggle sidebar"
        class="flex h-6 w-6 shrink-0 items-center justify-center rounded text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:text-zinc-500 dark:hover:bg-white/5 dark:hover:text-zinc-300"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
          class="transition-transform duration-200"
          [class.rotate-180]="collapsed()"
          aria-hidden="true"
        >
          <path d="m15 18-6-6 6-6"/>
        </svg>
      </button>
    </div>

    <!-- Body: scrollable, grows to fill -->
    <div class="flex-1 overflow-y-auto py-1">
      <ng-content select="[mkSidebarBody]" />
    </div>

    <!-- Footer: sticky bottom strip -->
    <div class="shrink-0 border-t border-gray-100 p-2 dark:border-border">
      <ng-content select="[mkSidebarFooter]" />
    </div>
  `,
})
export class SidebarComponent {
  readonly collapsed   = model(false);
  readonly storageKey  = input<string | null>(null);
  readonly altShortcut = input<string | null>(null);

  protected readonly sidebarWidth = computed(() => this.collapsed() ? '56px' : '220px');
  protected readonly toggleTitle  = computed(() =>
    this.altShortcut()
      ? (this.collapsed() ? `Expand sidebar · Alt+${this.altShortcut()}` : `Collapse sidebar · Alt+${this.altShortcut()}`)
      : (this.collapsed() ? 'Expand sidebar' : 'Collapse sidebar')
  );

  constructor() {
    // Restore persisted state before first render.
    effect(() => {
      const key = this.storageKey();
      if (!key) return;
      const stored = localStorage.getItem(key);
      if (stored !== null) this.collapsed.set(stored === 'true');
    });

    // Persist whenever collapsed changes.
    effect(() => {
      const key = this.storageKey();
      if (key) localStorage.setItem(key, String(this.collapsed()));
    });
  }

  toggle(): void {
    this.collapsed.update(v => !v);
  }

  @HostListener('window:keydown', ['$event'])
  protected onKeydown(e: KeyboardEvent): void {
    const key = this.altShortcut();
    if (e.altKey && key && e.key === key) {
      e.preventDefault();
      this.toggle();
    }
  }
}
