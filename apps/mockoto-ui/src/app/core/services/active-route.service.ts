import { Injectable, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRouteSnapshot, NavigationEnd, Router } from '@angular/router';
import { filter, map, startWith } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ActiveRouteService {
  private readonly router = inject(Router);

  private readonly routeSnapshot$ = this.router.events.pipe(
    filter((e): e is NavigationEnd => e instanceof NavigationEnd),
    startWith(null),
    map(() => this.router.routerState.snapshot.root),
  );

  readonly activeProjectId = toSignal(
    this.routeSnapshot$.pipe(map(root => this.extractParam(root, 'projectId'))),
    { initialValue: null },
  );

  readonly activeSessionId = toSignal(
    this.routeSnapshot$.pipe(map(root => this.extractParam(root, 'sessionId'))),
    { initialValue: null },
  );

  private extractParam(snapshot: ActivatedRouteSnapshot, param: string): string | null {
    let route: ActivatedRouteSnapshot | null = snapshot;
    while (route) {
      if (route.params[param]) return route.params[param];
      route = route.firstChild;
    }
    return null;
  }
}
