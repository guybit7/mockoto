import { Injectable, signal } from '@angular/core';
import type { Toast, ToastInput } from './toast.types';

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly _toasts = signal<Toast[]>([]);
  readonly toasts = this._toasts.asReadonly();

  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();

  add(input: ToastInput): void {
    const id = crypto.randomUUID();
    const durationMs = input.durationMs ?? 4000;

    this._toasts.update(list => [...list, { ...input, id }]);

    const timer = setTimeout(() => this.dismiss(id), durationMs);
    this.timers.set(id, timer);
  }

  dismiss(id: string): void {
    clearTimeout(this.timers.get(id));
    this.timers.delete(id);
    this._toasts.update(list => list.filter(t => t.id !== id));
  }
}
