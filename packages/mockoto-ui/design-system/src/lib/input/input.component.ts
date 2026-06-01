import { Component, input, model } from '@angular/core';

@Component({
  selector: 'mk-input',
  standalone: true,
  template: `
    <div class="flex flex-col gap-1.5">
      @if (label()) {
        <label class="text-xs font-medium text-gray-600 dark:text-zinc-400">{{ label() }}</label>
      }
      <input
        [type]="type()"
        [placeholder]="placeholder()"
        [disabled]="disabled()"
        [value]="value()"
        (input)="value.set(asInput($event).value)"
        class="h-9 w-full rounded-lg border border-gray-200 bg-white px-3 font-sans text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/15 disabled:cursor-not-allowed disabled:opacity-40 dark:border-border dark:bg-bg dark:text-zinc-100 dark:placeholder:text-zinc-600 dark:focus:border-accent dark:focus:ring-accent/15"
      />
      @if (error()) {
        <span class="text-xs text-red-500 dark:text-red-400">{{ error() }}</span>
      }
    </div>
  `,
})
export class InputComponent {
  readonly label = input('');
  readonly type = input<'text' | 'email' | 'password' | 'url' | 'number'>('text');
  readonly placeholder = input('');
  readonly disabled = input(false);
  readonly error = input('');
  readonly value = model('');

  protected asInput(e: Event): HTMLInputElement {
    return e.target as HTMLInputElement;
  }
}
