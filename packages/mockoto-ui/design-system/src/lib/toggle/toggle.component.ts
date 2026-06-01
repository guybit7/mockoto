import { Component, computed, input, model } from '@angular/core';
import { BrnToggleDirective } from '@spartan-ng/ui-toggle-brain';

@Component({
  selector: 'mk-toggle',
  standalone: true,
  imports: [BrnToggleDirective],
  template: `
    <button
      type="button"
      brnToggle
      [state]="brnState()"
      (stateChange)="onStateChange($event)"
      [disabled]="disabled()"
      [attr.aria-label]="label()"
      class="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40 dark:focus-visible:ring-offset-bg"
      [class.bg-accent]="checked()"
      [class.bg-gray-200]="!checked()"
      [class.dark:bg-accent]="checked()"
      [class.dark:bg-zinc-700]="!checked()"
    >
      <span
        class="pointer-events-none block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-150"
        [class.translate-x-4]="checked()"
        [class.translate-x-0]="!checked()"
      ></span>
    </button>
  `,
})
export class ToggleComponent {
  readonly label    = input('');
  readonly disabled = input(false);
  readonly checked  = model(false);

  protected readonly brnState = computed(() => this.checked() ? 'on' as const : 'off' as const);

  protected onStateChange(state: 'on' | 'off'): void {
    this.checked.set(state === 'on');
  }
}
