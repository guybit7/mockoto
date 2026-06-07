import { Injectable, signal } from '@angular/core';

export interface ConfirmDialogConfig {
  title: string;
  body?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
  /** Focus the confirm button instead of cancel on open. Use for low-risk confirmations (e.g. discard changes). */
  focusConfirm?: boolean;
}

export interface ActiveConfirmDialog extends ConfirmDialogConfig {
  resolve: (confirmed: boolean) => void;
}

@Injectable({ providedIn: 'root' })
export class ConfirmDialogService {
  private readonly _active = signal<ActiveConfirmDialog | null>(null);
  readonly active = this._active.asReadonly();

  confirm(config: ConfirmDialogConfig): Promise<boolean> {
    // Resolve any in-flight dialog (cancel it) before opening a new one,
    // so the previous caller's Promise always settles instead of hanging.
    this.respond(false);
    return new Promise(resolve => {
      this._active.set({ ...config, resolve });
    });
  }

  respond(confirmed: boolean): void {
    const d = this._active();
    this._active.set(null);
    d?.resolve(confirmed);
  }
}
