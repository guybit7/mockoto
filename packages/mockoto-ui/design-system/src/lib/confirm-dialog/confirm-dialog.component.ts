import { Component, input, output } from '@angular/core';
import { ButtonComponent } from '../button/button.component';
import type { Variant } from '../types';

@Component({
  selector: 'mk-confirm-dialog',
  standalone: true,
  imports: [ButtonComponent],
  template: `
    @if (open()) {
      <div class="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-8">
        <div class="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-2xl dark:border-border dark:bg-surface">
          <p class="text-xl font-semibold text-gray-900 dark:text-zinc-100">{{ title() }}</p>
          @if (body()) {
            <p class="mt-2 text-sm text-gray-500 dark:text-zinc-400">{{ body() }}</p>
          }
          <div class="mt-6 flex justify-end gap-3">
            <mk-button variant="secondary" type="button" (click)="cancelled.emit()">{{ cancelLabel() }}</mk-button>
            <mk-button [variant]="confirmVariant()" type="button" (click)="confirmed.emit()">{{ confirmLabel() }}</mk-button>
          </div>
        </div>
      </div>
    }
  `,
})
export class ConfirmDialogComponent {
  readonly open           = input.required<boolean>();
  readonly title          = input('');
  readonly body           = input('');
  readonly confirmLabel   = input('Confirm');
  readonly cancelLabel    = input('Cancel');
  readonly confirmVariant = input<Variant>('danger');

  readonly confirmed = output<void>();
  readonly cancelled = output<void>();
}
