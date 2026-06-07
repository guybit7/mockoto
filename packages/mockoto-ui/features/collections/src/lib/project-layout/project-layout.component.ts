import {
  Component,
  computed,
  effect,
  inject,
  input,
  model,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import {
  ButtonComponent,
  EmptyStateComponent,
  ErrorStateComponent,
  SidebarComponent,
} from '@mockoto-ui/design-system';
import { queryViewStatus } from '@mockoto-ui/core';
import { CollectionsService } from '../collections.service';
import { CollectionItemComponent } from '../collection-item/collection-item.component';

@Component({
  selector: 'mk-project-layout',
  standalone: true,
  imports: [
    RouterOutlet,
    SidebarComponent,
    CollectionItemComponent,
    EmptyStateComponent,
    ButtonComponent,
    ErrorStateComponent,
  ],
  host: { class: 'flex h-full min-h-0' },
  template: `
    <mk-sidebar
      [(collapsed)]="collapsed"
      storageKey="mockoto:sidebar-collapsed"
      altShortcut="1"
    >
      <!-- Header slot: label (hidden when collapsed) -->
      <ng-container mkSidebarHeader>
        @if (!collapsed()) {
          <span class="flex-1 truncate pl-1 text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-zinc-500">
            Collections
          </span>
        }
      </ng-container>

      <!-- Body slot: collection list -->
      <ng-container mkSidebarBody>
        @if (sidebarStatus() === 'loading') {
          @if (collapsed()) {
            <div class="flex flex-col items-center gap-0.5 px-1 py-0.5">
              @for (_ of skeletons; track $index) {
                <div class="h-7 w-7 animate-pulse rounded-lg bg-gray-100 dark:bg-white/5"></div>
              }
            </div>
          } @else {
            <div class="flex flex-col gap-0.5 px-2 py-0.5">
              @for (row of skeletons; track $index) {
                <div class="flex h-8 animate-pulse items-center gap-2 rounded-lg bg-gray-100 px-3 dark:bg-white/5">
                  <div class="h-3.5 w-3.5 shrink-0 rounded-sm bg-gray-200 dark:bg-white/10"></div>
                  <div class="h-2.5 rounded bg-gray-200 dark:bg-white/10" [style.width]="row.w"></div>
                </div>
              }
            </div>
          }
        } @else if (sidebarStatus() === 'error') {
          <div class="px-2 py-1">
            <mk-error-state message="Failed to load collections." />
            <mk-button size="sm" class="mt-2 w-full" (click)="collectionsQuery.refetch()">
              Try again
            </mk-button>
          </div>
        } @else {
          @for (col of collectionsQuery.data() ?? []; track col.id) {
            <mk-collection-item
              [collection]="col"
              [active]="activeId() === col.id"
              [collapsed]="collapsed()"
              [updating]="updateMut.isPending()"
              [deleting]="deleteMut.isPending()"
              (navigated)="navigateTo(col.id)"
              (editClicked)="editCollection(col.id)"
              (deleteClicked)="deleteCollection(col.id, col.isActive)"
              (setActiveClicked)="setActive(col.id)"
              (toggleFavoriteClicked)="toggleFavorite(col.id, col.isFavorite)"
            />
          }
        }
      </ng-container>

      <!-- Footer slot: new collection button -->
      <ng-container mkSidebarFooter>
        @if (collapsed()) {
          <button
            type="button"
            (click)="openNew()"
            title="New Collection"
            aria-label="New Collection"
            class="flex h-8 w-full items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:text-zinc-500 dark:hover:bg-white/5 dark:hover:text-zinc-300"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
                 fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M5 12h14"/><path d="M12 5v14"/>
            </svg>
          </button>
        } @else {
          <button
            type="button"
            (click)="openNew()"
            class="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-zinc-500 dark:hover:bg-white/5 dark:hover:text-zinc-300"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24"
                 fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M5 12h14"/><path d="M12 5v14"/>
            </svg>
            New Collection
          </button>
        }
      </ng-container>
    </mk-sidebar>

    <!-- Main content -->
    <div class="flex min-h-0 flex-1 flex-col overflow-auto">
      @if (sidebarStatus() === 'error') {
        <mk-error-state variant="page" message="Failed to load collections.">
          <mk-button size="sm" (click)="collectionsQuery.refetch()">Try again</mk-button>
        </mk-error-state>
      } @else if (noCollections()) {
        <mk-empty-state
          title="No collections yet"
          subtitle="Collections group your mock rules. Create one to get started."
        >
          <svg slot="icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
               fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
          </svg>
          <mk-button size="sm" (click)="openNew()">New Collection</mk-button>
        </mk-empty-state>
      } @else {
        <router-outlet />
      }
    </div>
    <router-outlet name="panel" />
  `,
})
export class ProjectLayoutComponent {
  readonly projectId = input.required<string>();

  protected readonly collapsed = model(false);

  private readonly router = inject(Router);
  private readonly colSvc = inject(CollectionsService);

  protected readonly collectionsQuery = this.colSvc.collectionsQuery(() => this.projectId());
  protected readonly updateMut        = this.colSvc.updateMutation();
  protected readonly deleteMut        = this.colSvc.deleteMutation();
  protected readonly skeletons = [
    { w: '70%' }, { w: '52%' }, { w: '83%' }, { w: '64%' }, { w: '76%' },
  ];

  protected readonly sidebarStatus = computed(() =>
    queryViewStatus(this.collectionsQuery),
  );

  protected readonly noCollections = computed(() =>
    this.sidebarStatus() === 'ready' && (this.collectionsQuery.data()?.length ?? 0) === 0,
  );

  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      map(() => this.router.url),
    ),
    { initialValue: this.router.url },
  );

  protected readonly activeId = computed(() => {
    const m = this.currentUrl().match(/\/collections\/([^/?]+)/);
    return m?.[1] ?? null;
  });

  constructor() {
    // Auto-select the active collection (or first) when no collection is in the URL.
    effect(() => {
      const collections = this.collectionsQuery.data();
      if (!collections?.length || this.activeId()) return;
      const target = collections.find(c => c.isActive) ?? collections[0];
      this.router.navigate(
        ['/projects', this.projectId(), 'collections', target.id, 'rules'],
        { replaceUrl: true },
      );
    });
  }

  protected navigateTo(collectionId: string): void {
    this.router.navigate(['/projects', this.projectId(), 'collections', collectionId, 'rules']);
  }

  protected openNew(): void {
    this.router.navigate([
      '/projects', this.projectId(), 'collections', { outlets: { panel: ['new'] } },
    ]);
  }

  protected editCollection(collectionId: string): void {
    this.router.navigate(['/projects', this.projectId(), 'collections', { outlets: { panel: [collectionId] } }]);
  }

  protected toggleFavorite(collectionId: string, current: boolean): void {
    this.updateMut.mutate({ id: collectionId, dto: { isFavorite: !current } });
  }

  protected setActive(collectionId: string): void {
    this.updateMut.mutate({ id: collectionId, dto: { isActive: true } });
  }

  protected deleteCollection(collectionId: string, wasActive: boolean): void {
    if (!confirm('Delete this collection? This cannot be undone.')) return;
    const remaining = (this.collectionsQuery.data() ?? []).filter(c => c.id !== collectionId);
    const fallback  = remaining.find(c => c.isActive) ?? remaining[0] ?? null;
    const wasFocused = this.activeId() === collectionId;

    if (wasFocused) {
      if (fallback) {
        this.router.navigate(['/projects', this.projectId(), 'collections', fallback.id, 'rules']);
      } else {
        this.router.navigate(['/projects', this.projectId(), 'collections']);
      }
    }

    this.deleteMut.mutate(collectionId, {
      onSuccess: () => {
        if (wasActive && fallback) {
          this.updateMut.mutate({ id: fallback.id, dto: { isActive: true } });
        }
      },
    });
  }
}
