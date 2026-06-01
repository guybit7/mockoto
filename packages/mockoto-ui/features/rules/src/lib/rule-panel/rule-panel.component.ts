import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { BasePanelComponent, panelEntityStatus } from '@mockoto-ui/core';
import { FormsModule } from '@angular/forms';
import { ButtonComponent, InputComponent, PanelQueryGateComponent, SidePanelComponent, ToggleComponent } from '@mockoto-ui/design-system';
import { HTTP_METHODS, type HttpMethod } from '@mockoto/shared';
import { RulesService } from '../rules.service';

const SELECT_CLASS = [
  'h-8 w-full rounded-lg border border-gray-200 bg-white px-3',
  'font-sans text-xs text-gray-900',
  'transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/15',
  'dark:border-border dark:bg-bg dark:text-zinc-100 dark:focus:border-accent dark:focus:ring-accent/15',
].join(' ');

@Component({
  selector: 'mk-rule-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, SidePanelComponent, InputComponent, ButtonComponent, ToggleComponent, PanelQueryGateComponent],
  template: `
    <mk-side-panel [title]="mode === 'create' ? 'New Rule' : 'Edit Rule'" (closed)="close()">
      <mk-panel-query-gate
        [status]="entityStatus()"
        notFoundTitle="Rule not found"
        notFoundSubtitle="This rule may have been deleted."
        errorMessage="Failed to load rule."
        (retry)="dataQuery.refetch()"
        (closed)="close()"
      >
      <form (ngSubmit)="save()" class="flex flex-1 flex-col">

        <!-- ── Scrollable fields ─────────────────────────────── -->
        <div class="flex flex-1 flex-col gap-5">

          <!-- Request section -->
          <div class="flex flex-col gap-3">
            <div class="flex items-center gap-2">
              <span class="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-zinc-600">Request</span>
              <div class="h-px flex-1 bg-gray-100 dark:bg-border"></div>
            </div>

            <div class="flex flex-col gap-1.5">
              <label class="text-xs font-medium text-gray-600 dark:text-zinc-400">Method</label>
              <select [ngModel]="requestMethod()" (ngModelChange)="requestMethod.set($event)" name="requestMethod" [class]="SELECT_CLASS">
                @for (m of methods; track m) { <option [value]="m">{{ m }}</option> }
              </select>
            </div>

            <mk-input
              label="URL Pattern"
              [value]="url()"
              (valueChange)="url.set($any($event))"
              [error]="urlError()"
              placeholder="/api/users/:id"
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

            <div class="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2 dark:border-border">
              <div>
                <p class="text-xs font-medium text-gray-700 dark:text-zinc-300">Enabled</p>
                <p class="mt-0.5 text-xs text-gray-400 dark:text-zinc-600">Rule responds to matching requests</p>
              </div>
              <mk-toggle [checked]="isEnabled()" (checkedChange)="isEnabled.set($any($event))" />
            </div>

            <div class="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2 dark:border-border">
              <div>
                <p class="text-xs font-medium text-gray-700 dark:text-zinc-300">Passthrough</p>
                <p class="mt-0.5 text-xs text-gray-400 dark:text-zinc-600">Forward to origin instead of mocking</p>
              </div>
              <mk-toggle [checked]="passthrough()" (checkedChange)="passthrough.set($any($event))" />
            </div>
          </div>

        </div>

        <!-- ── Sticky footer ─────────────────────────────────── -->
        <div class="sticky bottom-0 -mx-5 mt-4 border-t border-gray-100 bg-white px-5 py-3 dark:border-border dark:bg-surface">
          <div class="flex items-center justify-between">
            @if (mode === 'edit') {
              <mk-button variant="danger" type="button" (click)="delete()">Delete</mk-button>
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
export class RulePanelComponent extends BasePanelComponent {
  private readonly svc = inject(RulesService);

  private readonly projectId = this.route.snapshot.pathFromRoot
    .map(s => s.paramMap.get('projectId'))
    .find(id => id != null)!;

  private readonly collectionId = this.route.snapshot.pathFromRoot
    .map(s => s.paramMap.get('collectionId'))
    .find(id => id != null)!;

  protected readonly methods      = [...HTTP_METHODS];
  protected readonly SELECT_CLASS = SELECT_CLASS;

  protected readonly dataQuery = this.svc.ruleQuery(() => this.entityId);
  private readonly createMut = this.svc.createMutation();
  private readonly updateMut = this.svc.updateMutation();
  private readonly deleteMut = this.svc.deleteMutation();

  protected readonly url           = signal('');
  protected readonly requestMethod = signal('GET');
  protected readonly description   = signal('');
  protected readonly isEnabled      = signal(true);
  protected readonly passthrough    = signal(false);
  protected readonly urlError       = signal('');

  protected readonly entityStatus = computed(() =>
    this.mode === 'create' ? 'ready' as const : panelEntityStatus(this.dataQuery),
  );

  constructor() {
    super();
    effect(() => {
      const data = this.dataQuery.data();
      if (data && !this.populated) {
        this.url.set(data.url);
        this.requestMethod.set(data.requestMethod);
        this.description.set(data.description ?? '');
        this.isEnabled.set(data.isEnabled);
        this.passthrough.set(data.passthrough);
        this.populated = true;
      }
    });
  }

  protected override navigateBack(): void {
    this.router.navigate([{ outlets: { panel: null } }], { relativeTo: this.route.parent, queryParamsHandling: 'preserve' });
  }

  protected override deleteConfirmMessage(): string {
    return 'Delete this rule and all its responses?';
  }

  protected override isFormDirty(): boolean {
    if (this.mode === 'create') return !!this.url();
    const data = this.dataQuery.data();
    if (!data) return false;
    return this.url() !== data.url || this.requestMethod() !== data.requestMethod;
  }

  protected override validate(): boolean {
    this.urlError.set('');
    if (!this.url().trim()) { this.urlError.set('URL pattern is required'); return false; }
    return true;
  }

  protected override async doSave(): Promise<void> {
    if (this.entityId) {
      await this.updateMut.mutateAsync({
        id: this.entityId,
        dto: {
          url:           this.url(),
          requestMethod: this.requestMethod() as HttpMethod,
          description:   this.description() || undefined,
          isEnabled:     this.isEnabled(),
          passthrough:   this.passthrough(),
        },
      });
    } else {
      await this.createMut.mutateAsync({
        collectionId:  this.collectionId,
        projectId:     this.projectId,
        url:           this.url(),
        requestMethod: this.requestMethod() as HttpMethod,
        description:   this.description() || undefined,
        isFavorite:    false,
        isEnabled:     this.isEnabled(),
        passthrough:   this.passthrough(),
      });
    }
  }

  protected override async doDelete(id: string): Promise<void> {
    await this.deleteMut.mutateAsync(id);
    this.router.navigate([
      '/projects', this.projectId,
      'collections', this.collectionId,
      'rules',
    ]);
  }
}
