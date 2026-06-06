import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink, NavigationEnd, Router } from '@angular/router';
import { filter, startWith } from 'rxjs';
import { BreadcrumbContextService, DefaultPageService } from '@mockoto-ui/core';

interface Crumb { label: string; url: string }

@Component({
  selector: 'mk-breadcrumb',
  standalone: true,
  imports: [RouterLink],
  template: `
    <nav aria-label="breadcrumb" class="flex items-center gap-3">

      <!-- Pin button — only shown when there are crumbs (i.e. inside a project/collection/rule) -->
      @if (crumbs().length > 0) {
        @if (isPinned()) {
          <button
            type="button"
            (click)="unpin()"
            title="Remove default page"
            class="flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-medium
                   text-accent ring-1 ring-accent/30 transition-colors
                   hover:bg-accent/10"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24"
                 fill="currentColor" stroke="currentColor" stroke-width="2"
                 stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" x2="12" y1="17" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/>
            </svg>
            Default
          </button>
        } @else {
          <button
            type="button"
            (click)="pin()"
            title="Set as default page"
            class="flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-medium
                   text-gray-400 ring-1 ring-gray-200 transition-colors
                   hover:text-gray-700 hover:ring-gray-300
                   dark:text-zinc-600 dark:ring-zinc-700
                   dark:hover:text-zinc-400 dark:hover:ring-zinc-600"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24"
                 fill="none" stroke="currentColor" stroke-width="2"
                 stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" x2="12" y1="17" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/>
            </svg>
            Set as default
          </button>
        }
      }

      <ol class="flex items-center gap-1 text-xs text-gray-500 dark:text-zinc-600">
        @for (crumb of crumbs(); track crumb.url; let last = $last; let first = $first) {
          <li class="flex items-center gap-1">
            @if (!first) {
              <span class="text-gray-200 dark:text-zinc-800">/</span>
            }
            @if (last) {
              <span class="font-medium text-gray-700 dark:text-zinc-400">{{ crumb.label }}</span>
            } @else {
              <a [routerLink]="crumb.url" class="transition-colors hover:text-gray-900 dark:hover:text-zinc-300">{{ crumb.label }}</a>
            }
          </li>
        }
      </ol>
    </nav>
  `,
})
export class BreadcrumbComponent {
  private readonly router      = inject(Router);
  private readonly ctx         = inject(BreadcrumbContextService);
  private readonly defaultPage = inject(DefaultPageService);

  private readonly nav = toSignal(
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      startWith(null),
    ),
    { initialValue: null },
  );

  protected readonly crumbs = computed<Crumb[]>(() => {
    this.nav();
    const context  = this.ctx.context();
    const segments = this.router.url.split('?')[0].split('/').filter(Boolean);
    const crumbs: Crumb[] = [];

    if (segments[0] !== 'projects') return crumbs;

    crumbs.push({ label: 'Projects', url: '/projects' });

    const projectId = segments[1];
    if (!projectId || projectId === 'new') return crumbs;
    if (segments[2] !== 'collections') return crumbs;

    const collectionsUrl = `/projects/${projectId}/collections`;

    if (context.projectName) {
      crumbs.push({ label: context.projectName, url: collectionsUrl });
    }

    const collectionId = segments[3];
    if (!collectionId || collectionId === 'new') return crumbs;
    if (segments[4] !== 'rules') return crumbs;

    const rulesUrl = `/projects/${projectId}/collections/${collectionId}/rules`;

    if (context.collectionName) {
      crumbs.push({ label: context.collectionName, url: rulesUrl });
    }

    const ruleId = segments[5];
    if (!ruleId || ruleId === 'new') return crumbs;
    if (segments[6] !== 'responses') return crumbs;

    const responsesUrl = `/projects/${projectId}/collections/${collectionId}/rules/${ruleId}/responses`;
    crumbs.push({ label: 'Responses', url: responsesUrl });

    if (context.ruleName) {
      crumbs.push({ label: context.ruleName, url: responsesUrl });
    }

    return crumbs;
  });

  protected readonly isPinned = computed(() => {
    this.nav(); // re-evaluate on navigation
    const pinned = this.defaultPage.pinnedUrl();
    return pinned === this.router.url;
  });

  protected pin():   void { this.defaultPage.pin();   }
  protected unpin(): void { this.defaultPage.unpin(); }
}
