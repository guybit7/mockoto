import { DestroyRef, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ShortcutService } from './shortcut.service';
import { injectPanelRoute } from './inject-panel-route';

/**
 * Template-method base for all route-panel components.
 *
 * Algorithm defined here:
 *   save()   → validate() → doSave() → navigateBack()
 *   delete() → confirm    → doDelete()
 *   close()  → isDirty()  → navigateBack()
 *
 * Subclasses implement the abstract hooks; override navigateBack() /
 * deleteConfirmMessage() when the default doesn't fit.
 * doSave() / doDelete() must NOT call navigateBack() — save() handles that.
 */
export abstract class BasePanelComponent {
  protected readonly route: ActivatedRoute;
  protected readonly router: Router;
  protected readonly entityId: string | null;
  protected readonly mode: 'create' | 'edit';
  protected readonly saving = signal(false);
  protected populated = false;
  private saved = false;

  constructor() {
    this.route  = inject(ActivatedRoute);
    this.router = inject(Router);

    const { entityId, mode } = injectPanelRoute();
    this.entityId = entityId;
    this.mode     = mode;

    const shortcuts = inject(ShortcutService);
    shortcuts.push({ save: () => this.save(), delete: () => this.delete() });
    inject(DestroyRef).onDestroy(() => shortcuts.pop());
  }

  // ── Template methods ────────────────────────────────────────────────────

  protected async save(): Promise<void> {
    if (!this.validate()) return;
    this.saving.set(true);
    try {
      await this.doSave();
    } finally {
      this.saving.set(false);
    }
    // Set saved synchronously before navigateBack() schedules navigation,
    // so dirtyGuard sees saved=true when it runs as a microtask.
    this.saved = true;
    this.navigateBack();
  }

  protected async delete(): Promise<void> {
    if (!this.entityId || !confirm(this.deleteConfirmMessage())) return;
    await this.doDelete(this.entityId);
  }

  protected close(): void {
    if (this.isDirty() && !confirm('Discard unsaved changes?')) return;
    this.navigateBack();
  }

  // ── Public dirty check (used by dirtyGuard) ──────────────────────────────

  isDirty(): boolean {
    return !this.saved && this.isFormDirty();
  }

  // ── Virtual hooks (override when needed) ────────────────────────────────

  protected navigateBack(): void {
    this.router.navigate([{ outlets: { panel: null } }], { relativeTo: this.route.parent });
  }

  protected deleteConfirmMessage(): string {
    return 'Delete this item?';
  }

  /** Return false (and set any error signals) to abort save. */
  protected validate(): boolean {
    return true;
  }

  // ── Abstract hooks (must implement) ─────────────────────────────────────

  /** Perform the mutation only. Do NOT call navigateBack() — save() does that. */
  protected abstract doSave(): Promise<void>;

  /** Called only when entityId is set and user confirmed. Perform delete + navigate. */
  protected abstract doDelete(id: string): Promise<void>;

  protected abstract isFormDirty(): boolean;
}
