import { Route } from '@angular/router';

export const homeRoutes: Route[] = [
  {
    path: '',
    loadComponent: () =>
      import('./home-page/home-page.component').then(m => m.HomePageComponent),
  },
  {
    path: 'cli',
    loadComponent: () =>
      import('./cli-reference/cli-reference.component').then(m => m.CliReferenceComponent),
  },
];
