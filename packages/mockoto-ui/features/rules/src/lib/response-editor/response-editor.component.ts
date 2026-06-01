import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { NgClass } from '@angular/common';
import { ButtonComponent } from '@mockoto-ui/design-system';
import { ResponseInlineFormComponent, ResponseTabComponent } from '@mockoto-ui/features/responses';
import type { Rule, RuleResponse } from '@mockoto/shared';

const METHOD_COLOR: Record<string, string> = {
  GET:     'bg-emerald-50  text-emerald-600  dark:bg-emerald-500/10  dark:text-emerald-400',
  POST:    'bg-blue-50     text-blue-600     dark:bg-blue-500/10     dark:text-blue-400',
  PUT:     'bg-amber-50    text-amber-600    dark:bg-amber-500/10    dark:text-amber-400',
  PATCH:   'bg-orange-50   text-orange-600   dark:bg-orange-500/10   dark:text-orange-400',
  DELETE:  'bg-red-50      text-red-600      dark:bg-red-500/10      dark:text-red-400',
  HEAD:    'bg-violet-50   text-violet-600   dark:bg-violet-500/10   dark:text-violet-400',
  OPTIONS: 'bg-zinc-100    text-zinc-600     dark:bg-zinc-800        dark:text-zinc-400',
};

@Component({
  selector: 'mk-response-editor',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgClass, ButtonComponent, ResponseTabComponent, ResponseInlineFormComponent],
  host: { class: 'flex min-h-0 flex-1 flex-col overflow-hidden' },
  template: `
    <!-- Rule header -->
    <div class="flex shrink-0 items-center gap-2 border-b border-gray-100 bg-gray-50/60 px-4 py-3 dark:border-border dark:bg-white/[0.02]">
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
      <mk-button size="sm" (click)="newResponseClicked.emit()">New Response</mk-button>
    </div>

    <!-- Response tabs -->
    @if (responsesLoading()) {
      <div class="flex shrink-0 items-center gap-1 border-b border-gray-100 px-3 py-2 dark:border-border">
        <div class="h-7 w-24 animate-pulse rounded-md bg-gray-100 dark:bg-white/5"></div>
        <div class="h-7 w-20 animate-pulse rounded-md bg-gray-100 dark:bg-white/5"></div>
      </div>
    } @else if (showTabs()) {
      <div class="flex shrink-0 flex-wrap items-center gap-2 overflow-y-auto border-b border-gray-100 px-3 py-3 dark:border-border" style="max-height: 120px">
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
      <div class="flex flex-1 flex-col items-center justify-center gap-3">
        <p class="text-sm text-gray-400 dark:text-zinc-500">No responses yet</p>
        <mk-button size="sm" (click)="newResponseClicked.emit()">New Response</mk-button>
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

  protected readonly methodClasses = computed<string>(() =>
    METHOD_COLOR[this.rule().requestMethod] ?? 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
  );

  protected readonly showTabs = computed<boolean>(() =>
    this.responses().length > 0 || this.editingResponseId() === 'new'
  );
}
