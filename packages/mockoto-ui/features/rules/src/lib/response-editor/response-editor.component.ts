import { ChangeDetectionStrategy, Component, computed, HostListener, input, output, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { ButtonComponent } from '@mockoto-ui/design-system';
import { ResponseInlineFormComponent, ResponseTabComponent } from '@mockoto-ui/features/responses';
import type { Rule, RuleResponse } from '@mockoto/shared';
import { METHOD_COLOR } from '../method-colors';

@Component({
  selector: 'mk-response-editor',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgClass, ButtonComponent, ResponseTabComponent, ResponseInlineFormComponent],
  host: { '[class]': 'hostClass()' },
  template: `
    <!-- Rule header -->
    <div class="flex shrink-0 items-center gap-2 border-b border-gray-100 bg-gray-50/60 px-4 py-3 dark:border-border dark:bg-white/2">
      <span
        class="inline-flex h-[18px] shrink-0 items-center rounded px-1.5 font-mono text-xs font-bold tracking-wide"
        [ngClass]="methodClasses()"
      >{{ rule().requestMethod }}</span>
      <span class="flex-1 truncate font-mono text-xs text-gray-700 dark:text-zinc-300">{{ rule().url }}</span>
      <button
        type="button"
        (click)="openInBrowserClicked.emit()"
        title="Open in browser"
        aria-label="Open rule in browser"
        class="flex h-7 w-7 items-center justify-center rounded text-gray-400 transition-colors hover:text-indigo-500 dark:text-zinc-500 dark:hover:text-indigo-400"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24"
             fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
          <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
        </svg>
      </button>
      <button
        type="button"
        (click)="fullscreen.set(!fullscreen())"
        [title]="fullscreen() ? 'Exit fullscreen (Esc)' : 'Fullscreen'"
        [attr.aria-label]="fullscreen() ? 'Exit fullscreen' : 'Expand to fullscreen'"
        [attr.aria-pressed]="fullscreen()"
        class="flex h-7 w-7 items-center justify-center rounded text-gray-400 transition-colors hover:text-indigo-500 dark:text-zinc-500 dark:hover:text-indigo-400"
      >
        @if (fullscreen()) {
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24"
               fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M8 3v3a2 2 0 0 1-2 2H3"/><path d="M21 8h-3a2 2 0 0 1-2-2V3"/>
            <path d="M3 16h3a2 2 0 0 1 2 2v3"/><path d="M16 21v-3a2 2 0 0 1 2-2h3"/>
          </svg>
        } @else {
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24"
               fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M3 8V5a2 2 0 0 1 2-2h3"/><path d="M16 3h3a2 2 0 0 1 2 2v3"/>
            <path d="M21 16v3a2 2 0 0 1-2 2h-3"/><path d="M8 21H5a2 2 0 0 1-2-2v-3"/>
          </svg>
        }
      </button>
      <mk-button size="sm" (click)="newResponseClicked.emit()">New Response</mk-button>
    </div>

    <!-- Response tabs -->
    @if (responsesLoading()) {
      <div class="flex shrink-0 items-center gap-1 border-b border-gray-100 px-3 py-2 dark:border-border">
        <div class="h-7 w-24 animate-pulse rounded-md bg-gray-100 dark:bg-white/5"></div>
        <div class="h-7 w-20 animate-pulse rounded-md bg-gray-100 dark:bg-white/5"></div>
      </div>
    } @else if (showTabs()) {
      <div class="flex max-h-[120px] shrink-0 flex-wrap items-center gap-2 overflow-y-auto border-b border-gray-100 px-3 py-3 dark:border-border">
        @for (resp of responses(); track resp.id) {
          <mk-response-tab
            [response]="resp"
            [selected]="editingResponseId() === resp.id"
            [setPending]="setPending()"
            (editClicked)="editingResponseIdChange.emit(resp.id)"
            (setActiveClicked)="setActiveClicked.emit(resp.id)"
          />
        }
        @if (editingResponseId() === 'new') {
          <span class="flex shrink-0 items-center rounded-lg border border-zinc-400 dark:border-zinc-400 bg-white dark:bg-white/[0.08] px-3 py-2 text-sm font-medium text-gray-700 dark:text-zinc-200 shadow-sm">
            New
          </span>
        }
      </div>
    }

    <!-- Form or empty state -->
    @if (editingResponseId()) {
      <div class="min-h-0 flex-1">
        <mk-response-inline-form
          [id]="editingResponseId() === 'new' ? null : editingResponseId()"
          [ruleId]="rule().id"
          [projectId]="projectId()"
          [collectionId]="collectionId()"
          [requestMethod]="rule().requestMethod"
          [requestBodyJson]="requestBodyJson()"
          (payloadSave)="payloadSave.emit($event)"
          (saved)="editingResponseIdChange.emit($event)"
          (deleteRequested)="deleteRequested.emit($event)"
        />
      </div>
    } @else if (!responsesLoading() && responses().length === 0) {
      <div class="flex flex-1 flex-col items-center justify-center gap-2">
        <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 dark:bg-white/5">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
               fill="none" stroke="currentColor" stroke-width="1.5"
               stroke-linecap="round" stroke-linejoin="round"
               class="text-gray-400 dark:text-zinc-500">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="12" x2="12" y1="11" y2="17"/>
            <line x1="9" x2="15" y1="14" y2="14"/>
          </svg>
        </div>
        <p class="text-sm font-medium text-gray-700 dark:text-zinc-300">No responses yet</p>
        <p class="text-xs text-gray-400 dark:text-zinc-600">Click <span class="font-medium text-gray-600 dark:text-zinc-400">New Response</span> above to add one</p>
      </div>
    }
  `,
})
export class ResponseEditorComponent {
  readonly rule              = input.required<Rule>();
  readonly responses         = input<RuleResponse[]>([]);
  readonly responsesLoading  = input(false);
  readonly editingResponseId = input<string | null>(null);
  readonly projectId         = input('');
  readonly collectionId      = input('');
  readonly requestBodyJson   = input('');
  readonly setPending        = input(false);

  readonly editingResponseIdChange = output<string | null>();
  readonly newResponseClicked      = output<void>();
  readonly openInBrowserClicked    = output<void>();
  readonly setActiveClicked        = output<string>();
  readonly payloadSave             = output<unknown>();
  readonly deleteRequested         = output<string>();

  protected readonly fullscreen = signal(false);

  protected readonly hostClass = computed(() =>
    this.fullscreen()
      ? 'fixed inset-0 z-[9999] flex flex-col overflow-hidden bg-white dark:bg-surface'
      : 'flex min-h-0 flex-1 flex-col overflow-hidden'
  );

  protected readonly methodClasses = computed<string>(() =>
    METHOD_COLOR[this.rule().requestMethod] ?? 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
  );

  protected readonly showTabs = computed<boolean>(() =>
    this.responses().length > 0 || this.editingResponseId() === 'new'
  );

  @HostListener('document:keydown', ['$event'])
  protected onKeydown(e: KeyboardEvent): void {
    if (e.key === 'Escape' && this.fullscreen()) {
      e.stopImmediatePropagation();
      this.fullscreen.set(false);
    }
  }
}
