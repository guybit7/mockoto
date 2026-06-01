import { Route } from '@angular/router';

export const homeRoutes: Route[] = [
  {
    path: '',
    loadComponent: () =>
      import('./home-page/home-page.component').then(m => m.HomePageComponent),
  },
];
