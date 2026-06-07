import { afterNextRender, Component, effect, ElementRef, HostListener, inject, Injector, ViewChild } from '@angular/core';
import { ConfirmDialogService } from '@mockoto-ui/core';

@Component({
  selector: 'mk-confirm-dialog-host',
  standalone: true,
  template: `
    @if (svc.active(); as d) {
      <div
        class="fixed inset-0 z-200 flex items-center justify-center bg-black/50 p-8"
        (click)="svc.respond(false)"
      >
        <div
          class="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-2xl dark:border-border dark:bg-surface"
          (click)="$event.stopPropagation()"
        >
          <p class="text-xl font-semibold text-gray-900 dark:text-zinc-100">{{ d.title }}</p>
          @if (d.body) {
            <p class="mt-2 text-sm text-gray-500 dark:text-zinc-400">{{ d.body }}</p>
          }
          <div class="mt-6 flex justify-end gap-3">
            <button
              #cancelBtn
              type="button"
              (click)="svc.respond(false)"
              class="inline-flex h-8 cursor-pointer items-center justify-center rounded-lg border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 hover:text-gray-900 dark:border-border dark:bg-transparent dark:text-zinc-300 dark:hover:bg-surface dark:hover:text-zinc-100"
            >{{ d.cancelLabel ?? 'Cancel' }}</button>
            <button
              #confirmBtn
              type="button"
              (click)="svc.respond(true)"
              [class]="confirmClass(d.variant)"
            >{{ d.confirmLabel ?? 'Confirm' }}</button>
          </div>
        </div>
      </div>
    }
  `,
})
export class ConfirmDialogHostComponent {
  protected readonly svc = inject(ConfirmDialogService);
  @ViewChild('cancelBtn')  private cancelBtn?:  ElementRef<HTMLButtonElement>;
  @ViewChild('confirmBtn') private confirmBtn?: ElementRef<HTMLButtonElement>;

  constructor() {
    const injector = inject(Injector);
    effect(() => {
      const d = this.svc.active();
      if (d) {
        afterNextRender(
          () => (d.focusConfirm ? this.confirmBtn : this.cancelBtn)?.nativeElement.focus(),
          { injector },
        );
      }
    });
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.svc.active()) this.svc.respond(false);
  }

  protected confirmClass(variant: string | undefined): string {
    const base = 'inline-flex h-8 cursor-pointer items-center justify-center rounded-lg px-4 text-sm font-medium text-white transition-colors';
    const color = variant === 'primary' ? 'bg-accent hover:bg-accent/85' : 'bg-red-600 hover:bg-red-500';
    return `${base} ${color}`;
  }
}
