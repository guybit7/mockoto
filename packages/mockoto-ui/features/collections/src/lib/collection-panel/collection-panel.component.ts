import { Component, computed, effect, inject, signal } from '@angular/core';
import { BasePanelComponent, panelEntityStatus } from '@mockoto-ui/core';
import { FormsModule } from '@angular/forms';
import { ButtonComponent, InputComponent, PanelQueryGateComponent, SidePanelComponent, ToggleComponent } from '@mockoto-ui/design-system';
import type { CollectionMode } from '@mockoto/shared';
import { CollectionsService } from '../collections.service';

const SELECT_CLASS = [
  'h-8 w-full rounded-lg border border-gray-200 bg-white px-3',
  'font-sans text-xs text-gray-900',
  'transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/15',
  'dark:border-border dark:bg-bg dark:text-zinc-100 dark:focus:border-accent dark:focus:ring-accent/15',
].join(' ');

@Component({
  selector: 'mk-collection-panel',
  standalone: true,
  imports: [FormsModule, SidePanelComponent, InputComponent, ButtonComponent, ToggleComponent, PanelQueryGateComponent],
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

          <!-- Info section -->
          <div class="flex flex-col gap-3">
            <div class="flex items-center gap-2">
              <span class="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-zinc-600">Info</span>
              <div class="h-px flex-1 bg-gray-100 dark:bg-border"></div>
            </div>

            <mk-input
              label="Name"
              [value]="name()"
              (valueChange)="name.set($any($event))"
              [error]="nameError()"
              placeholder="Auth flows"
            />

            <mk-input
              label="Description"
              [value]="description()"
              (valueChange)="description.set($any($event))"
              placeholder="Optional description"
            />
          </div>

          <!-- Behavior section -->
          <div class="flex flex-col gap-3">
            <div class="flex items-center gap-2">
              <span class="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-zinc-600">Behavior</span>
              <div class="h-px flex-1 bg-gray-100 dark:bg-border"></div>
            </div>

            <div class="flex flex-col gap-1.5">
              <label class="text-xs font-medium text-gray-600 dark:text-zinc-400">Mode</label>
              <select
                [ngModel]="collectionMode()"
                (ngModelChange)="collectionMode.set($event)"
                name="collectionMode"
                [class]="SELECT_CLASS"
              >
                @for (opt of modeOptions; track opt.value) {
                  <option [value]="opt.value">{{ opt.label }}</option>
                }
              </select>
            </div>

            <div class="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2 dark:border-border">
              <div>
                <p class="text-xs font-medium text-gray-700 dark:text-zinc-300">Active</p>
                <p class="mt-0.5 text-xs text-gray-400 dark:text-zinc-600">Collection responds to matching requests</p>
              </div>
              <mk-toggle [checked]="isActive()" (checkedChange)="isActive.set($any($event))" />
            </div>
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

  protected readonly modeOptions: { value: CollectionMode; label: string }[] = [
    { value: 'local', label: 'Local' },
    { value: 'proxy', label: 'Proxy' },
  ];
  protected readonly SELECT_CLASS = SELECT_CLASS;

  protected readonly dataQuery = this.svc.collectionQuery(() => this.entityId);
  private readonly createMut = this.svc.createMutation();
  private readonly updateMut = this.svc.updateMutation();
  private readonly deleteMut = this.svc.deleteMutation();

  private createdId: string | null = null;

  protected readonly name           = signal('');
  protected readonly description    = signal('');
  protected readonly collectionMode = signal<CollectionMode>('local');
  protected readonly isActive       = signal(false);
  protected readonly nameError      = signal('');

  protected readonly entityStatus = computed(() =>
    this.mode === 'create' ? 'ready' as const : panelEntityStatus(this.dataQuery),
  );

  constructor() {
    super();
    if (this.mode === 'create') this.isActive.set(true);
    effect(() => {
      const data = this.dataQuery.data();
      if (data && !this.populated) {
        this.name.set(data.name);
        this.description.set(data.description ?? '');
        this.collectionMode.set(data.mode);
        this.isActive.set(data.isActive);
        this.populated = true;
      }
    });
  }

  protected override deleteDialogTitle() { return 'Delete this collection?'; }
  protected override deleteDialogBody()  { return 'This will also delete all rules and responses in this collection.'; }

  protected override isFormDirty(): boolean {
    if (this.mode === 'create') return !!this.name();
    const data = this.dataQuery.data();
    if (!data) return false;
    return this.name() !== data.name || this.description() !== (data.description ?? '');
  }

  protected override validate(): boolean {
    this.nameError.set('');
    if (!this.name().trim()) { this.nameError.set('Name is required'); return false; }
    return true;
  }

  protected override async doSave(): Promise<void> {
    if (this.entityId) {
      await this.updateMut.mutateAsync({
        id: this.entityId,
        dto: {
          name:        this.name(),
          description: this.description() || undefined,
          mode:        this.collectionMode(),
          isActive:    this.isActive(),
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
        recordingStrategy: 'none',
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
