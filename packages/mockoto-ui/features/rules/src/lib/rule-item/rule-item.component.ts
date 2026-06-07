import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { NgClass } from '@angular/common';
import type { Rule } from '@mockoto/shared';

const METHOD_COLOR: Record<string, string> = {
  GET:     'bg-emerald-50  text-emerald-600  dark:bg-emerald-500/10  dark:text-emerald-400',
  POST:    'bg-blue-50     text-blue-600     dark:bg-blue-500/10     dark:text-blue-400',
  PUT:     'bg-amber-50    text-amber-600    dark:bg-amber-500/10    dark:text-amber-400',
  PATCH:   'bg-orange-50   text-orange-600   dark:bg-orange-500/10   dark:text-orange-400',
  DELETE:  'bg-red-50      text-red-600      dark:bg-red-500/10      dark:text-red-400',
  HEAD:    'bg-violet-50   text-violet-600   dark:bg-violet-500/10   dark:text-violet-400',
  OPTIONS: 'bg-zinc-100    text-zinc-600     dark:bg-zinc-800        dark:text-zinc-400',
};

const PASSTHROUGH_ON  = 'bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400';
const PASSTHROUGH_OFF = 'bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-zinc-400';

/** Renders as a <tr> inside the rules table. Emits outputs for all mutations. */
@Component({
  selector: 'tr[mk-rule-item]',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgClass],
  host: { '[class]': 'hostClasses()', '(click)': 'ruleClicked.emit()' },
  template: `
    <!-- Favorite star -->
    <td class="w-[44px] px-3 py-2.5">
      <button
        type="button"
        (click)="favoriteToggled.emit(); $event.stopPropagation()"
        [disabled]="updating()"
        [attr.aria-label]="rule().isFavorite ? 'Remove from favorites' : 'Add to favorites'"
        class="flex h-7 w-7 items-center justify-center rounded transition-colors disabled:cursor-not-allowed disabled:opacity-50"
        [class]="rule().isFavorite
          ? 'text-amber-400 hover:text-amber-500'
          : 'text-gray-200 hover:text-amber-300 dark:text-zinc-700 dark:hover:text-amber-400'"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
             [attr.fill]="rule().isFavorite ? 'currentColor' : 'none'"
             stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
             aria-hidden="true">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
      </button>
    </td>

    <!-- Method badge -->
    <td class="w-[85px] px-3 py-2.5">
      <span
        class="inline-flex h-[18px] items-center rounded px-1.5 font-mono text-xs font-bold tracking-wide"
        [ngClass]="methodClasses()"
      >{{ rule().requestMethod }}</span>
    </td>

    <!-- URL + description -->
    <td class="px-3 py-2.5">
      <span class="block font-mono text-sm leading-snug text-gray-800 dark:text-zinc-200">{{ rule().url }}</span>
      @if (rule().description) {
        <span class="mt-0.5 block truncate text-xs text-gray-400 dark:text-zinc-600">{{ rule().description }}</span>
      }
    </td>

    <!-- Type (passthrough / mock) -->
    <td class="w-[80px] px-3 py-2.5">
      <span
        class="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium"
        [ngClass]="rule().passthrough ? passthroughOnClass : passthroughOffClass"
      >
        @if (rule().passthrough) {
          <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 24 24"
               fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
          </svg>
          Pass
        } @else {
          <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 24 24"
               fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>
          </svg>
          Mock
        }
      </span>
    </td>

    <!-- Enabled toggle -->
    <td class="w-[110px] px-3 py-2.5">
      <button
        type="button"
        (click)="enabledToggled.emit(); $event.stopPropagation()"
        [disabled]="updating()"
        class="inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-white/5"
        [attr.aria-label]="rule().isEnabled ? 'Disable rule' : 'Enable rule'"
      >
        <span class="h-1.5 w-1.5 rounded-full"
              [class]="rule().isEnabled ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-zinc-600'"></span>
        <span class="text-xs font-medium"
              [class]="rule().isEnabled ? 'text-emerald-600 dark:text-emerald-500' : 'text-gray-400 dark:text-zinc-600'">
          {{ rule().isEnabled ? 'Enabled' : 'Disabled' }}
        </span>
      </button>
    </td>

    <!-- Actions (edit + delete) -->
    <td class="w-[70px] px-3 py-2.5">
      <div class="flex items-center justify-end gap-0.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
          <button
            type="button"
            (click)="editClicked.emit(); $event.stopPropagation()"
            title="Edit rule"
            aria-label="Edit rule"
            class="flex h-6 w-6 items-center justify-center rounded text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-zinc-600 dark:hover:bg-white/5 dark:hover:text-zinc-300"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24"
                 fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/>
            </svg>
          </button>
          <button
            type="button"
            (click)="deleteClicked.emit(); $event.stopPropagation()"
            [disabled]="deleting()"
            title="Delete rule"
            aria-label="Delete rule"
            class="flex h-6 w-6 items-center justify-center rounded text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-40 dark:text-zinc-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24"
                 fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
            </svg>
          </button>
        </div>
    </td>
  `,
})
export class RuleItemComponent {
  readonly rule     = input.required<Rule>();
  readonly selected = input.required<boolean>();
  readonly updating = input(false);
  readonly deleting = input(false);

  readonly ruleClicked      = output<void>();
  readonly enabledToggled   = output<void>();
  readonly favoriteToggled  = output<void>();
  readonly editClicked      = output<void>();
  readonly deleteClicked    = output<void>();

  protected readonly passthroughOnClass  = PASSTHROUGH_ON;
  protected readonly passthroughOffClass = PASSTHROUGH_OFF;

  protected readonly hostClasses = computed<string>(() => {
    const base = 'group cursor-pointer transition-colors duration-150';
    return this.selected()
      ? `${base} [box-shadow:inset_4px_0_0_#8b5cf6] bg-gray-50 dark:bg-white/[0.06] font-semibold text-gray-900 dark:text-zinc-50`
      : `${base} hover:bg-gray-50 dark:hover:bg-white/[0.04]`;
  });

  protected readonly methodClasses = computed<string>(() =>
    METHOD_COLOR[this.rule().requestMethod] ?? 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
  );
}
