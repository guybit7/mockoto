import { APP_INITIALIZER, ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import {
  PreloadAllModules,
  provideRouter,
  withComponentInputBinding,
  withPreloading,
  withRouterConfig,
} from '@angular/router';
import { QueryClient, provideTanStackQuery } from '@tanstack/angular-query-experimental';
import { withDevtools } from '@tanstack/angular-query-experimental/devtools';
import { DefaultPageService, HTTP_BASE_URL, toastInterceptor } from '@mockoto-ui/core';
import { provideMonacoEditor } from 'ngx-monaco-editor-v2';
import { appRoutes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideAnimations(),
    provideHttpClient(withFetch(), withInterceptors([toastInterceptor])),
    provideRouter(
      appRoutes,
      withComponentInputBinding(),
      withRouterConfig({ paramsInheritanceStrategy: 'always' }),
      withPreloading(PreloadAllModules),
    ),
    provideTanStackQuery(
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 30,
          },
        },
      }),
      withDevtools(),
    ),
    { provide: HTTP_BASE_URL, useValue: '/api' },
    {
      provide: APP_INITIALIZER,
      useFactory: (svc: DefaultPageService) => () => svc.restoreOnStartup(),
      deps: [DefaultPageService],
      multi: true,
    },
    provideMonacoEditor(),
  ],
};
