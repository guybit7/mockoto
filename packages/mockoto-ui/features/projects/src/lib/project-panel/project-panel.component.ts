import { Component, computed, effect, inject, signal } from '@angular/core';
import { BasePanelComponent, panelEntityStatus } from '@mockoto-ui/core';
import { FormsModule } from '@angular/forms';
import { ButtonComponent, InputComponent, PanelQueryGateComponent, SidePanelComponent } from '@mockoto-ui/design-system';
import { ProjectsService } from '../projects.service';
import { isValidBaseUrl } from './project-panel.validators';

@Component({
  selector: 'mk-project-panel',
  standalone: true,
  imports: [FormsModule, SidePanelComponent, InputComponent, ButtonComponent, PanelQueryGateComponent],
  template: `
    <mk-side-panel [title]="mode === 'create' ? 'New Project' : 'Edit Project'" (closed)="close()">
      <mk-panel-query-gate
        [status]="entityStatus()"
        notFoundTitle="Project not found"
        notFoundSubtitle="This project may have been deleted."
        errorMessage="Failed to load project."
        (retry)="dataQuery.refetch()"
        (closed)="close()"
      >
      <form (ngSubmit)="save()" class="flex flex-1 flex-col">

        <!-- ── Scrollable fields ─────────────────────────────── -->
        <div class="flex flex-1 flex-col gap-4">
          @if (logoUrl()) {
            <div class="flex items-center gap-3 rounded-lg border border-gray-100 p-3 dark:border-border">
              <img
                [src]="logoUrl()"
                alt="Logo preview"
                class="h-10 w-10 rounded-lg object-cover"
                (error)="onImgError($event)"
              />
              <span class="text-xs text-gray-400 dark:text-zinc-600">Logo preview</span>
            </div>
          }

          <mk-input
            label="Name"
            [value]="name()"
            (valueChange)="name.set($any($event))"
            [error]="nameError()"
            placeholder="My API"
          />
          <mk-input
            label="Base URL"
            [value]="baseUrl()"
            (valueChange)="baseUrl.set($any($event))"
            [error]="baseUrlError()"
            placeholder="https://api.example.com"
            type="url"
          />
          <mk-input
            label="Logo URL"
            [value]="logoUrl()"
            (valueChange)="logoUrl.set($any($event))"
            placeholder="https://example.com/logo.png"
            type="url"
          />
          <mk-input
            label="Description"
            [value]="description()"
            (valueChange)="description.set($any($event))"
            placeholder="Optional description"
          />
          <mk-input
            label="Owner"
            [value]="ownerName()"
            (valueChange)="ownerName.set($any($event))"
            [error]="ownerNameError()"
            placeholder="Team or person responsible"
          />
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
export class ProjectPanelComponent extends BasePanelComponent {
  private readonly svc = inject(ProjectsService);

  protected readonly dataQuery = this.svc.projectQuery(() => this.entityId);
  private readonly createMut = this.svc.createMutation();
  private readonly updateMut = this.svc.updateMutation();
  private readonly deleteMut = this.svc.deleteMutation();

  protected readonly name         = signal('');
  protected readonly baseUrl      = signal('');
  protected readonly logoUrl      = signal('');
  protected readonly description  = signal('');
  protected readonly ownerName    = signal('');
  protected readonly nameError      = signal('');
  protected readonly baseUrlError  = signal('');
  protected readonly ownerNameError = signal('');

  protected readonly entityStatus = computed(() =>
    this.mode === 'create' ? 'ready' as const : panelEntityStatus(this.dataQuery),
  );

  constructor() {
    super();
    effect(() => {
      const data = this.dataQuery.data();
      if (data && !this.populated) {
        this.name.set(data.name);
        this.baseUrl.set(data.baseUrl);
        this.logoUrl.set(data.logoUrl ?? '');
        this.description.set(data.description ?? '');
        this.ownerName.set(data.ownerName ?? '');
        this.populated = true;
      }
    });
  }

  protected override navigateBack(): void {
    this.router.navigate(['/projects']);
  }

  protected override deleteDialogTitle() { return 'Delete this project?'; }
  protected override deleteDialogBody()  { return 'This cannot be undone.'; }

  protected override isFormDirty(): boolean {
    if (this.mode === 'create') return !!(this.name() || this.baseUrl() || this.logoUrl() || this.description() || this.ownerName());
    const data = this.dataQuery.data();
    if (!data) return false;
    return (
      this.name()        !== data.name                  ||
      this.baseUrl()     !== data.baseUrl                ||
      this.logoUrl()     !== (data.logoUrl     ?? '')    ||
      this.description() !== (data.description ?? '')    ||
      this.ownerName()   !== (data.ownerName   ?? '')
    );
  }

  protected override validate(): boolean {
    this.nameError.set('');
    this.baseUrlError.set('');
    this.ownerNameError.set('');
    if (!this.name().trim()) { this.nameError.set('Name is required'); return false; }
    const rawUrl = this.baseUrl().trim();
    if (!rawUrl) { this.baseUrlError.set('Base URL is required'); return false; }
    if (!isValidBaseUrl(rawUrl)) {
      this.baseUrlError.set('Enter a valid URL (e.g. https://api.example.com or localhost:3000)');
      return false;
    }
    if (!this.ownerName().trim()) { this.ownerNameError.set('Owner is required'); return false; }
    return true;
  }

  protected override async doSave(): Promise<void> {
    const dto = {
      name:        this.name(),
      baseUrl:     this.baseUrl(),
      logoUrl:     this.logoUrl() || undefined,
      description: this.description() || undefined,
      ownerName:   this.ownerName(),
      isFavorite:  false,
    };
    if (this.entityId) {
      await this.updateMut.mutateAsync({ id: this.entityId, dto });
    } else {
      await this.createMut.mutateAsync(dto);
    }
  }

  protected override async doDelete(id: string): Promise<void> {
    await this.deleteMut.mutateAsync(id);
  }

  protected onImgError(event: Event): void {
    (event.target as HTMLImageElement).style.display = 'none';
  }
}
