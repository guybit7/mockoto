import { Injectable, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';

export interface ShortcutContext {
  save?: () => void | Promise<void>;
  delete?: () => void;
}

@Injectable({ providedIn: 'root' })
export class ShortcutService {
  private readonly doc = inject(DOCUMENT);
  private readonly stack: ShortcutContext[] = [];

  constructor() {
    this.doc.addEventListener('keydown', this.onKeyDown);
  }

  push(ctx: ShortcutContext): void {
    this.stack.push(ctx);
  }

  pop(): void {
    this.stack.pop();
  }

  private readonly onKeyDown = (e: KeyboardEvent): void => {
    if (!e.altKey) return;
    const key = e.key.toLowerCase();
    const ctx = this.stack.at(-1);
    if (key === 's' && ctx?.save) {
      e.preventDefault();
      ctx.save();
    } else if (key === 'd' && ctx?.delete) {
      e.preventDefault();
      ctx.delete();
    }
  };
}
