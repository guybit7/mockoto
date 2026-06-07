import { DestroyRef, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, type UrlSegmentGroup } from '@angular/router';
import { ShortcutService } from './shortcut.service';
import { injectPanelRoute } from './inject-panel-route';
import { ConfirmDialogService } from './confirm-dialog/confirm-dialog.service';
import type { HasUnsavedChanges } from './guards/dirty.guard';

/**
 * Template-method base for all route-panel components.
 *
 * Algorithm defined here:
 *   save()          → validate() → doSave() → navigateBack()
 *   requestDelete() → confirm    → doDelete() → navigateBack()
 *   close()         → navigateBack()  (dirty guard on the route shows the dialog)
 *
 * Subclasses implement the abstract hooks; override navigateBack() /
 * deleteDialogTitle() / deleteDialogBody() when the default doesn't fit.
 * doSave() / doDelete() must NOT call navigateBack() — the base handles that after both.
 */
export abstract class BasePanelComponent implements HasUnsavedChanges {
  protected readonly route: ActivatedRoute;
  protected readonly router: Router;
  private  readonly dialogs: ConfirmDialogService;
  protected readonly entityId: string | null;
  protected readonly mode: 'create' | 'edit';
  protected readonly saving = signal(false);
  protected populated = false;
  private saved = false;

  constructor() {
    this.route   = inject(ActivatedRoute);
    this.router  = inject(Router);
    this.dialogs = inject(ConfirmDialogService);

    const { entityId, mode } = injectPanelRoute();
    this.entityId = entityId;
    this.mode     = mode;

    const shortcuts = inject(ShortcutService);
    shortcuts.push({ save: () => this.save(), delete: () => this.requestDelete() });
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
    this.saved = true;
    this.navigateBack();
  }

  protected close(): void {
    // The canDeactivate dirtyGuard on the route shows the confirmation dialog
    // for ALL navigation (close button, keyboard shortcut, browser back).
    // No check needed here — just trigger the navigation.
    this.navigateBack();
  }

  protected async requestDelete(): Promise<void> {
    if (!this.entityId) return;
    const confirmed = await this.dialogs.confirm({
      title: this.deleteDialogTitle(),
      body: this.deleteDialogBody(),
      confirmLabel: 'Delete',
    });
    if (!confirmed) return;
    // Set saved AFTER doDelete succeeds so a failed mutation does not
    // permanently disable the dirty guard for this panel instance.
    await this.doDelete(this.entityId);
    this.saved = true;
    this.navigateBack();
  }

  // ── Public dirty check (used by dirtyGuard) ──────────────────────────────

  isDirty(): boolean {
    return !this.saved && this.isFormDirty();
  }

  // ── Virtual hooks (override when needed) ────────────────────────────────

  protected navigateBack(): void {
    const tree = this.router.parseUrl(this.router.url);
    this.removePanelOutlet(tree.root);
    this.router.navigateByUrl(tree);
  }

  private removePanelOutlet(group: UrlSegmentGroup): boolean {
    if ('panel' in group.children) {
      delete group.children['panel'];
      return true; // found — stop traversal
    }
    for (const child of Object.values(group.children)) {
      if (this.removePanelOutlet(child)) return true;
    }
    return false;
  }

  protected deleteDialogTitle(): string { return 'Delete this item?'; }
  protected deleteDialogBody(): string  { return 'This action cannot be undone.'; }

  /** Return false (and set any error signals) to abort save. */
  protected validate(): boolean {
    return true;
  }

  // ── Abstract hooks (must implement) ─────────────────────────────────────

  /** Perform the mutation only. Do NOT call navigateBack() — save() handles that. */
  protected abstract doSave(): Promise<void>;

  /** Called only when entityId is set and user confirmed. Perform the mutation only — do NOT call navigateBack(). */
  protected abstract doDelete(id: string): Promise<void>;

  protected abstract isFormDirty(): boolean;
}
