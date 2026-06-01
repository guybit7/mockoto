import { DestroyRef, inject } from '@angular/core';
import { ShortcutService } from './shortcut.service';

export abstract class ShortcutAware {
  constructor() {
    const shortcuts = inject(ShortcutService);
    shortcuts.push({ save: () => this.save(), delete: () => this.delete() });
    inject(DestroyRef).onDestroy(() => shortcuts.pop());
  }

  protected abstract save(): void | Promise<void>;
  protected abstract delete(): void | Promise<void>;
}
