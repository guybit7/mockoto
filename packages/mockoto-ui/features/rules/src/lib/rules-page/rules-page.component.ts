import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  HostListener,
  inject,
  input,
  linkedSignal,
  signal,
  untracked,
} from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ActivatedRoute, Router } from '@angular/router';
import { BreadcrumbContextService, ConfirmDialogService, queryViewStatus } from '@mockoto-ui/core';
import { ButtonComponent, ErrorStateComponent, LoadingSkeletonComponent, NotFoundStateComponent } from '@mockoto-ui/design-system';
import { CollectionsService } from '@mockoto-ui/features/collections';
import { ProjectsService } from '@mockoto-ui/features/projects';
import { RulesService } from '../rules.service';
import { ResponsesService } from '@mockoto-ui/features/responses';
import { RuleListComponent } from '../rule-list/rule-list.component';
import { ResponseEditorComponent } from '../response-editor/response-editor.component';
import { RuleTestService } from '../rule-test.service';
import { SplitHandleComponent, type SplitPreset } from '../split-handle/split-handle.component';

const SPLIT_PRESETS: readonly SplitPreset[] = [
  { value: 15, title: 'Full response · Alt+2', icon: { left: { x: 0.5, w: 2 },   right: { x: 4,    w: 9.5 } } },
  { value: 25, title: '¼ list · Alt+3',        icon: { left: { x: 0.5, w: 3 },   right: { x: 5,    w: 8.5 } } },
  { value: 50, title: '½ split · Alt+4',        icon: { left: { x: 0.5, w: 6 },   right: { x: 7.5,  w: 6   } } },
  { value: 75, title: '¾ list · Alt+5',         icon: { left: { x: 0.5, w: 9.5 }, right: { x: 11.5, w: 2   } } },
] as const;

@Component({
  selector: 'mk-rules-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RuleListComponent, ResponseEditorComponent, NotFoundStateComponent, ErrorStateComponent, ButtonComponent, LoadingSkeletonComponent, SplitHandleComponent],
  host: { '[class]': 'hostClass()' },
  template: `
    @switch (workspaceStatus()) {
      @case ('loading') {
        <div class="flex min-h-0 flex-1 flex-col gap-4 px-6 py-4">
          <mk-loading-skeleton [count]="1" rowHeight="h-7" [bordered]="false" rounded="rounded-lg" [inset]="true" />
          <mk-loading-skeleton [count]="8" rowHeight="h-9" gap="gap-2" [bordered]="false" [inset]="true" />
        </div>
      }
      @case ('error') {
        <div class="flex min-h-0 flex-1 flex-col">
          <mk-error-state variant="page" message="Failed to load collection.">
            <mk-button size="sm" (click)="collectionQuery.refetch()">Try again</mk-button>
            <mk-button size="sm" variant="secondary" (click)="backToProject()">Back to Project</mk-button>
          </mk-error-state>
        </div>
      }
      @case ('not-found') {
        <div class="flex min-h-0 flex-1 flex-col">
          <mk-not-found-state
            title="Collection not found"
            subtitle="This collection may have been deleted or the link is incorrect."
          >
            <mk-button size="sm" (click)="backToProject()">Back to Project</mk-button>
          </mk-not-found-state>
        </div>
      }
      @case ('rule-not-found') {
        <div class="flex min-h-0 flex-1 flex-col">
          <mk-not-found-state
            title="Rule not found"
            subtitle="This rule may have been deleted. Select another rule or go back."
          >
            <mk-button size="sm" (click)="backToCollection()">Back to Collection</mk-button>
            <mk-button size="sm" variant="secondary" (click)="clearRuleSelection()">Select Another Rule</mk-button>
          </mk-not-found-state>
        </div>
      }
      @default {
        <!-- Left: rule list -->
        <mk-rule-list
          [style.width]="selectedRule() ? splitLeft() + '%' : '100%'"
          [rules]="rulesQuery.data() ?? []"
          [loading]="rulesQuery.isPending()"
          [error]="rulesQuery.isError()"
          [selectedRuleId]="selectedRuleId()"
          [collectionName]="collectionName()"
          [collectionMode]="collectionMode()"
          [collectionIsFavorite]="collectionIsFavorite()"
          [collectionIsActive]="collectionIsActive()"
          [activeCollectionName]="activeCollectionName()"
          [fullscreen]="fullscreen()"
          [hasPrev]="canNavigateCollections()"
          [hasNext]="canNavigateCollections()"
          (activateCollectionClicked)="updateCollectionMut.mutate({ id: collectionId(), dto: { isActive: true } })"
          (fullscreenToggled)="fullscreen.set(!fullscreen())"
          (collectionFavoriteToggled)="updateCollectionMut.mutate({ id: collectionId(), dto: { isFavorite: !collectionIsFavorite() } })"
          (collectionModeToggled)="updateCollectionMut.mutate({ id: collectionId(), dto: { mode: collectionMode() === 'proxy' ? 'local' : 'proxy' } })"
          (prevClicked)="navigateCollection(-1)"
          (nextClicked)="navigateCollection(1)"
          [updatePending]="updateMut.isPending()"
          [deletePending]="deleteMut.isPending()"
          (newRuleClicked)="openNew()"
          (ruleSelected)="selectRule($event)"
          (enabledToggled)="updateMut.mutate({ id: $event.id, dto: { isEnabled: $event.enabled } })"
          (favoriteToggled)="updateMut.mutate({ id: $event.id, dto: { isFavorite: $event.favorite } })"
          (editClicked)="openEdit($event)"
          (deleteClicked)="confirmDelete($event)"
        />

        <!-- Drag handle -->
        @if (selectedRule()) {
          <mk-split-handle
            [splitLeft]="splitLeft()"
            [presets]="splitPresets"
            [containerRef]="containerEl"
            (splitChanged)="splitLeft.set($event)"
          />
        }

        <!-- Right: empty state or response editor -->
        @if (selectedRule()) {
          <mk-response-editor
            [rule]="selectedRule()!"
            [responses]="visibleResponses()"
            [responsesLoading]="responsesQuery.isPending()"
            [editingResponseId]="effectiveEditingId()"
            [projectId]="projectId()"
            [collectionId]="collectionId()"
            [requestBodyJson]="selectedRuleRequestBody()"
            [setPending]="setActiveMut.isPending()"
            (editingResponseIdChange)="editingResponseId.set($event)"
            (newResponseClicked)="editingResponseId.set('new')"
            (openInBrowserClicked)="openInBrowser()"
            (setActiveClicked)="setActive($event)"
            (payloadSave)="saveRulePayload($event)"
            (deleteRequested)="onDeleteRequested($event)"
          />
        }
      }
    }

    <router-outlet name="panel" />
  `,
})
export class RulesPageComponent {
  readonly projectId    = input.required<string>();
  readonly collectionId = input.required<string>();
  readonly rule         = input<string | undefined>(undefined);

  private readonly router       = inject(Router);
  private readonly route        = inject(ActivatedRoute);
  private readonly el           = inject(ElementRef<HTMLElement>);
  private readonly breadcrumb   = inject(BreadcrumbContextService);
  private readonly dialogs      = inject(ConfirmDialogService);
  private readonly colSvc       = inject(CollectionsService);
  private readonly projSvc      = inject(ProjectsService);
  private readonly rulesSvc     = inject(RulesService);
  private readonly responsesSvc = inject(ResponsesService);
  private readonly testSvc      = inject(RuleTestService);

  protected readonly containerEl = this.el.nativeElement;
  protected readonly splitPresets = SPLIT_PRESETS;

  private readonly projectQuery      = this.projSvc.projectQuery(() => this.projectId());
  protected readonly collectionQuery = this.colSvc.collectionQuery(() => this.collectionId());
  private readonly collectionsQuery  = this.colSvc.collectionsQuery(() => this.projectId());

  protected readonly collectionReady = computed(
    () => queryViewStatus(this.collectionQuery) === 'ready',
  );

  protected readonly rulesQuery = this.rulesSvc.rulesQuery(
    () => this.collectionId(),
    () => this.collectionReady(),
  );
  protected readonly responsesQuery = this.responsesSvc.responsesQuery(() => this.selectedRuleId() ?? '');

  protected readonly collectionName        = computed(() => this.collectionQuery.data()?.name ?? null);
  protected readonly collectionMode        = computed(() => this.collectionQuery.data()?.mode ?? null);
  protected readonly collectionIsFavorite  = computed(() => this.collectionQuery.data()?.isFavorite ?? false);
  protected readonly collectionIsActive   = computed(() => {
    const fromList = this.collectionsQuery.data()?.find(c => c.id === this.collectionId())?.isActive;
    return fromList ?? this.collectionQuery.data()?.isActive ?? null;
  });
  protected readonly activeCollectionName = computed(() =>
    this.collectionsQuery.data()?.find(c => c.isActive && c.id !== this.collectionId())?.name ?? null
  );
  protected readonly selectedRuleId  = computed(() => this.rule() ?? null);
  protected readonly selectedRule    = computed(() =>
    this.rulesQuery.data()?.find(r => r.id === this.selectedRuleId()) ?? null
  );

  private readonly collectionIndex = computed(() =>
    (this.collectionsQuery.data() ?? []).findIndex(c => c.id === this.collectionId())
  );
  protected readonly canNavigateCollections = computed(() => (this.collectionsQuery.data() ?? []).length > 1);

  protected readonly workspaceStatus = computed(() => {
    const collectionStatus = queryViewStatus(this.collectionQuery);
    if (collectionStatus !== 'ready') return collectionStatus;
    if (
      this.selectedRuleId() &&
      !this.rulesQuery.isPending() &&
      !this.rulesQuery.isError() &&
      this.rulesQuery.data() !== undefined &&
      !this.selectedRule()
    ) {
      return 'rule-not-found';
    }
    return 'ready';
  });

  protected readonly selectedRuleRequestBody = computed(() => {
    const rb = this.selectedRule()?.requestBody;
    return rb != null ? JSON.stringify(rb, null, 2) : '';
  });

  private readonly deletedIds          = linkedSignal<string[]>(() => { this.rule(); return []; });
  protected readonly editingResponseId = linkedSignal<string | null>(() => { this.rule(); return null; });
  private readonly autoSelectedOnce    = linkedSignal<boolean>(() => { this.collectionId(); return untracked(() => !!this.selectedRuleId()); });

  protected readonly visibleResponses = computed(() =>
    (this.responsesQuery.data() ?? []).filter(r => !this.deletedIds().includes(r.id))
  );

  protected readonly effectiveEditingId = computed<string | null>(() => {
    const explicit = this.editingResponseId();
    if (explicit !== null) return explicit;
    const available = this.visibleResponses();
    return (available.find(r => r.isActive) ?? available[0])?.id ?? null;
  });

  protected readonly updateMut          = this.rulesSvc.updateMutation();
  protected readonly deleteMut          = this.rulesSvc.deleteMutation();
  protected readonly updateCollectionMut = this.colSvc.updateMutation();
  protected readonly setActiveMut = this.responsesSvc.setActiveMutation();
  private readonly deleteResponseMut = this.responsesSvc.deleteMutation();

  protected readonly splitLeft  = signal(33.33);
  protected readonly fullscreen = signal(false);

  protected readonly hostClass = computed(() =>
    this.fullscreen()
      ? 'fixed inset-0 z-[9999] flex bg-white dark:bg-surface'
      : 'flex h-full min-h-0'
  );

  constructor() {
    effect(() => {
      const projectName    = this.projectQuery.data()?.name;
      const collectionName = this.collectionQuery.data()?.name;
      untracked(() => this.breadcrumb.patch({
        ...(projectName    ? { projectName }    : {}),
        ...(collectionName ? { collectionName } : {}),
      }));
    });

    effect(() => {
      const rules = this.rulesQuery.data();
      if (!rules || rules.length === 0 || this.selectedRuleId() || this.autoSelectedOnce()) return;
      const first = rules[0];
      untracked(() => {
        this.autoSelectedOnce.set(true);
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { rule: first.id },
          queryParamsHandling: 'merge',
          replaceUrl: true,
        });
      });
    });
  }

  protected setActive(responseId: string): void {
    this.setActiveMut.mutate(responseId, {
      onSuccess: () => this.editingResponseId.set(responseId),
    });
  }

  protected saveRulePayload(payload: unknown): void {
    const ruleId = this.selectedRuleId();
    if (!ruleId) return;
    this.updateMut.mutate({ id: ruleId, dto: { requestBody: payload as Record<string, unknown> } });
  }

  protected onDeleteRequested(id: string): void {
    this.deletedIds.update(ids => [...ids, id]);
    this.editingResponseId.set(null);
    this.deleteResponseMut.mutate(id);
  }

  protected openInBrowser(): void {
    const rule = this.selectedRule();
    if (rule) this.testSvc.openInBrowser(rule, this.projectId());
  }

  protected openNew(): void {
    this.router.navigate([{ outlets: { panel: ['new'] } }], {
      relativeTo: this.route, queryParamsHandling: 'preserve',
    });
  }

  protected openEdit(id: string): void {
    this.router.navigate(
      ['/projects', this.projectId(), 'collections', this.collectionId(), 'rules',
       { outlets: { panel: [id] } }],
      { queryParamsHandling: 'preserve' },
    );
  }

  protected async confirmDelete(id: string): Promise<void> {
    const wasSelected = this.selectedRuleId() === id;
    const confirmed = await this.dialogs.confirm({
      title: 'Delete this rule?',
      body: 'This will also delete all responses attached to this rule.',
      confirmLabel: 'Delete',
    });
    if (!confirmed) return;
    await this.deleteMut.mutateAsync(id);
    if (wasSelected) {
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { rule: null },
        queryParamsHandling: 'merge',
      });
    }
  }

  protected selectRule(ruleId: string): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { rule: ruleId },
      queryParamsHandling: 'merge',
    });
  }

  protected navigateCollection(offset: 1 | -1): void {
    const cols = this.collectionsQuery.data() ?? [];
    if (cols.length < 2) return;
    const idx = this.collectionIndex();
    if (idx === -1) return;
    const next = cols[(idx + offset + cols.length) % cols.length];
    if (next) this.router.navigate(['/projects', this.projectId(), 'collections', next.id, 'rules'], { replaceUrl: true });
  }

  protected backToProject(): void {
    this.router.navigate(['/projects', this.projectId(), 'collections']);
  }

  protected backToCollection(): void {
    this.router.navigate(
      ['/projects', this.projectId(), 'collections', this.collectionId(), 'rules'],
      { queryParams: { rule: null }, queryParamsHandling: 'merge' },
    );
  }

  protected clearRuleSelection(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { rule: null },
      queryParamsHandling: 'merge',
    });
  }

  @HostListener('window:keydown', ['$event'])
  protected onKeydown(e: KeyboardEvent): void {
    if (e.key === 'Escape' && this.fullscreen()) {
      e.stopImmediatePropagation();
      this.fullscreen.set(false);
      return;
    }
    const tag = (e.target as HTMLElement).tagName.toLowerCase();
    const isEditable = ['input', 'textarea', 'select'].includes(tag) || (e.target as HTMLElement).isContentEditable;
    if (!isEditable) {
      if (e.key === 'ArrowUp'   && this.canNavigateCollections()) { e.preventDefault(); this.navigateCollection(-1); return; }
      if (e.key === 'ArrowDown' && this.canNavigateCollections()) { e.preventDefault(); this.navigateCollection(1);  return; }
    }
    if (!e.altKey || !this.selectedRuleId()) return;
    const presets: Record<string, number> = { '2': 15, '3': 25, '4': 50, '5': 75 };
    const v = presets[e.key];
    if (v !== undefined) { e.preventDefault(); this.splitLeft.set(v); }
  }
}
