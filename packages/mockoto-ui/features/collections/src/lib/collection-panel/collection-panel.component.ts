import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { BasePanelComponent, panelEntityStatus } from '@mockoto-ui/core';
import { FormsModule } from '@angular/forms';
import { ButtonComponent, InputComponent, PanelQueryGateComponent, SidePanelComponent } from '@mockoto-ui/design-system';
import type { CollectionMode, RecordingStrategy, UpdateCollectionDto } from '@mockoto/shared';
import { CollectionsService } from '../collections.service';

@Component({
  selector: 'mk-collection-panel',
  standalone: true,
  imports: [FormsModule, SidePanelComponent, InputComponent, ButtonComponent, PanelQueryGateComponent],
  template: `
    <mk-side-panel [title]="mode === 'create' ? 'New Collection' : 'Edit Collection'" (closed)="close()">
      <mk-panel-query-gate
        [status]="entityStatus()"
        notFoundTitle="Collection not found"
        notFoundSubtitle="This collection may have been deleted."
        errorMessage="Failed to load collection."
        (retry)="dataQuery.refetch()"
        (closed)="close()"
      >
      <form (ngSubmit)="save()" class="flex flex-1 flex-col">

        <!-- ── Scrollable fields ─────────────────────────────── -->
        <div class="flex flex-1 flex-col gap-5">

          <!-- Active indicator (top) -->
          <div class="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2 dark:border-border">
            <button type="button" (click)="onActiveToggle()" class="text-xs font-medium text-gray-700 dark:text-zinc-300 cursor-pointer">Active collection</button>
            <button
              type="button"
              (click)="onActiveToggle()"
              [title]="isActive() ? 'Active — click to deactivate' : 'Inactive — click to activate'"
              [attr.aria-label]="isActive() ? 'Active — click to deactivate' : 'Inactive — click to activate'"
              [attr.aria-pressed]="isActive()"
              class="flex h-7 w-7 items-center justify-center rounded transition-colors"
              [class]="isActive()
                ? 'text-emerald-500'
                : 'text-gray-300 hover:text-emerald-400 dark:text-zinc-600 dark:hover:text-emerald-500'"
            >
              <span
                class="h-3 w-3 rounded-full transition-colors"
                [class]="isActive()
                  ? 'bg-emerald-500 shadow-[0_0_6px_1px] shadow-emerald-400/60'
                  : 'border-2 border-current'"
              ></span>
            </button>
          </div>

          <!-- Info section -->
          <div class="flex flex-col gap-3">
            <div class="flex items-center gap-2">
              <span class="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-zinc-600">Info</span>
              <div class="h-px flex-1 bg-gray-100 dark:bg-border"></div>
            </div>

            <div (focusout)="onNameBlur()">
              <mk-input
                label="Name"
                [value]="name()"
                (valueChange)="name.set($event)"
                [error]="nameError()"
                placeholder="Auth flows"
              />
            </div>

            <div (focusout)="onDescriptionBlur()">
              <mk-input
                label="Description"
                [value]="description()"
                (valueChange)="description.set($event)"
                placeholder="Optional description"
              />
            </div>
          </div>

          <!-- Behavior section -->
          <div class="flex flex-col gap-3">
            <div class="flex items-center gap-2">
              <span class="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-zinc-600">Behavior</span>
              <div class="h-px flex-1 bg-gray-100 dark:bg-border"></div>
            </div>

            <!-- Mode button group -->
            <div class="flex flex-col gap-1.5">
              <label class="text-xs font-medium text-gray-600 dark:text-zinc-400">Mode</label>
              <div class="flex overflow-hidden rounded-lg border border-gray-200 dark:border-border">
                <button type="button" (click)="onModeChange('local')"
                  class="flex-1 px-3 py-1.5 text-xs font-medium transition-colors border-r border-gray-200 dark:border-border"
                  [class]="collectionMode() === 'local'
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                    : 'bg-transparent text-gray-500 hover:bg-gray-50 hover:text-gray-800 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-zinc-200'"
                >Local</button>
                <button type="button" (click)="onModeChange('proxy')"
                  class="flex-1 px-3 py-1.5 text-xs font-medium transition-colors"
                  [class]="collectionMode() === 'proxy'
                    ? 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300'
                    : 'bg-transparent text-gray-500 hover:bg-gray-50 hover:text-gray-800 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-zinc-200'"
                >Proxy</button>
              </div>
            </div>

            <!-- Recording strategy button grid (proxy only) -->
            @if (collectionMode() === 'proxy') {
              <div class="flex flex-col gap-1.5">
                <label class="text-xs font-medium text-gray-600 dark:text-zinc-400">Recording</label>
                <div class="grid grid-cols-2 gap-1.5">
                  @for (opt of recordingOptions; track opt.value) {
                    <button
                      type="button"
                      (click)="onStrategyChange(opt.value)"
                      class="rounded-lg border px-3 py-2 text-left text-xs font-medium transition-colors"
                      [class]="recordingStrategy() === opt.value
                        ? opt.activeClass
                        : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:text-gray-800 dark:border-border dark:bg-transparent dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:text-zinc-200'"
                    >{{ opt.label }}</button>
                  }
                </div>
                <p class="text-[11px] text-gray-400 dark:text-zinc-600">{{ recordingHint() }}</p>
              </div>
            }
          </div>

        </div>

        <!-- ── Sticky footer ─────────────────────────────────── -->
        <div class="sticky bottom-0 -mx-5 mt-4 border-t border-gray-100 bg-white px-5 py-3 dark:border-border dark:bg-surface">
          <div class="flex items-center justify-between">
            @if (mode === 'edit') {
              <mk-button variant="danger" type="button" (click)="requestDelete()">Delete</mk-button>
            } @else {
              <span></span>
            }
            <div class="flex gap-2">
              <mk-button variant="secondary" type="button" (click)="close()">Cancel</mk-button>
              <mk-button type="submit" [disabled]="saving()">{{ saving() ? 'Saving…' : 'Save' }}</mk-button>
            </div>
          </div>
        </div>

      </form>
      </mk-panel-query-gate>
    </mk-side-panel>
  `,
})
export class CollectionPanelComponent extends BasePanelComponent {
  private readonly svc = inject(CollectionsService);

  private readonly projectId = (this.route.snapshot.pathFromRoot
    .map(s => s.paramMap.get('projectId'))
    .find(id => id != null) ?? '');

  protected readonly recordingOptions: { value: RecordingStrategy; label: string; activeClass: string }[] = [
    { value: 'all',     label: 'All requests',  activeClass: 'border-indigo-400 bg-indigo-100 text-indigo-700 dark:border-indigo-500 dark:bg-indigo-500/15 dark:text-indigo-300' },
    { value: 'success', label: 'Success (2xx)', activeClass: 'border-emerald-400 bg-emerald-100 text-emerald-700 dark:border-emerald-500 dark:bg-emerald-500/15 dark:text-emerald-300' },
    { value: 'error',   label: 'Errors (4xx+)', activeClass: 'border-rose-400 bg-rose-100 text-rose-700 dark:border-rose-500 dark:bg-rose-500/15 dark:text-rose-300' },
    { value: 'none',    label: 'Passthrough',   activeClass: 'border-gray-300 bg-gray-100 text-gray-600 dark:border-zinc-600 dark:bg-white/5 dark:text-zinc-300' },
  ];

  protected readonly dataQuery = this.svc.collectionQuery(() => this.entityId);
  private readonly createMut = this.svc.createMutation();
  private readonly updateMut = this.svc.updateMutation();
  private readonly deleteMut = this.svc.deleteMutation();

  private createdId: string | null = null;

  protected readonly name               = signal('');
  protected readonly description        = signal('');
  protected readonly collectionMode     = signal<CollectionMode>('local');
  protected readonly recordingStrategy  = signal<RecordingStrategy>('none');
  protected readonly isActive           = signal(false);
  protected readonly nameError          = signal('');

  protected readonly recordingHint = computed(() => {
    switch (this.recordingStrategy()) {
      case 'all':     return 'Every proxied request is saved as a rule.';
      case 'success': return 'Only 2xx responses are saved as rules.';
      case 'error':   return 'Only 4xx/5xx responses are saved as rules.';
      case 'none':    return 'Requests are forwarded as-is — nothing is recorded.';
    }
  });

  protected readonly entityStatus = computed(() =>
    this.mode === 'create' ? 'ready' as const : panelEntityStatus(this.dataQuery),
  );

  constructor() {
    super();
    if (this.mode === 'create') this.isActive.set(true);
    effect(() => {
      const data = this.dataQuery.data();
      if (data && !this.populated) {
        untracked(() => {
          this.name.set(data.name);
          this.description.set(data.description ?? '');
          this.collectionMode.set(data.mode);
          this.recordingStrategy.set(data.recordingStrategy);
          this.isActive.set(data.isActive);
          this.populated = true;
        });
      }
    });
  }

  protected override deleteDialogTitle() { return 'Delete this collection?'; }
  protected override deleteDialogBody()  { return 'This will also delete all rules and responses in this collection.'; }

  protected override isFormDirty(): boolean {
    if (this.mode === 'create') return !!this.name();
    const data = this.dataQuery.data();
    if (!data) return false;
    return this.name()              !== data.name
        || this.description()       !== (data.description ?? '')
        || this.collectionMode()    !== data.mode
        || this.recordingStrategy() !== data.recordingStrategy
        || this.isActive()          !== data.isActive;
  }

  protected override validate(): boolean {
    this.nameError.set('');
    if (!this.name().trim()) { this.nameError.set('Name is required'); return false; }
    return true;
  }

  private autoSave(dto: UpdateCollectionDto): void {
    if (!this.entityId) return;
    this.updateMut.mutate({ id: this.entityId, dto });
  }

  protected onActiveToggle(): void {
    const next = !this.isActive();
    this.isActive.set(next);
    this.autoSave({ isActive: next });
  }

  protected onModeChange(mode: CollectionMode): void {
    this.collectionMode.set(mode);
    const strategy: RecordingStrategy = mode === 'local'
      ? 'none'
      : (this.recordingStrategy() === 'none' ? 'all' : this.recordingStrategy());
    this.recordingStrategy.set(strategy);
    this.autoSave({ mode, recordingStrategy: strategy });
  }

  protected onStrategyChange(value: RecordingStrategy): void {
    this.recordingStrategy.set(value);
    this.autoSave({ recordingStrategy: value });
  }

  protected onNameBlur(): void {
    if (!this.name().trim()) { this.nameError.set('Name is required'); return; }
    this.nameError.set('');
    this.autoSave({ name: this.name(), description: this.description() || undefined });
  }

  protected onDescriptionBlur(): void {
    this.autoSave({ description: this.description() || undefined });
  }

  protected override async doSave(): Promise<void> {
    if (this.entityId) {
      await this.updateMut.mutateAsync({
        id: this.entityId,
        dto: {
          name:              this.name(),
          description:       this.description() || undefined,
          mode:              this.collectionMode(),
          recordingStrategy: this.recordingStrategy(),
          isActive:          this.isActive(),
        },
      });
    } else {
      const created = await this.createMut.mutateAsync({
        projectId:         this.projectId,
        name:              this.name(),
        description:       this.description() || undefined,
        mode:              this.collectionMode(),
        isActive:          this.isActive(),
        isFavorite:        false,
        recordingStrategy: this.recordingStrategy(),
      });
      this.createdId = created.id;
    }
  }

  protected override navigateBack(): void {
    if (this.createdId) {
      this.router.navigate(
        [{ outlets: { primary: [this.createdId, 'rules'], panel: null } }],
        { relativeTo: this.route.parent },
      );
    } else {
      super.navigateBack();
    }
  }

  protected override async doDelete(id: string): Promise<void> {
    await this.deleteMut.mutateAsync(id);
  }
}
