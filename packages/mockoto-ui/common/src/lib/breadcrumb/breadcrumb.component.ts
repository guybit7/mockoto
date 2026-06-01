import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink, NavigationEnd, Router } from '@angular/router';
import { filter, startWith } from 'rxjs';
import { BreadcrumbContextService } from '@mockoto-ui/core';

interface Crumb { label: string; url: string }

@Component({
  selector: 'mk-breadcrumb',
  standalone: true,
  imports: [RouterLink],
  template: `
    <nav aria-label="breadcrumb">
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
  private readonly router = inject(Router);
  private readonly ctx    = inject(BreadcrumbContextService);

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
}
