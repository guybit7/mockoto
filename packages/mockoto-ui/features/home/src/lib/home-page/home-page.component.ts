import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProjectsService } from '@mockoto-ui/features/projects';

@Component({
  selector: 'mk-home-page',
  standalone: true,
  imports: [RouterLink],
  styles: [
    `
      @keyframes fade-in-up {
        from { opacity: 0; transform: translateY(16px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      @keyframes blob {
        0%, 100% { transform: scale(1) translate(0, 0); }
        33%  { transform: scale(1.06) translate(8px, -12px); }
        66%  { transform: scale(0.94) translate(-6px, 8px); }
      }
      @keyframes blob2 {
        0%, 100% { transform: scale(1) translate(0, 0); }
        33%  { transform: scale(0.94) translate(-10px, 10px); }
        66%  { transform: scale(1.08) translate(12px, -4px); }
      }
      @keyframes float-y {
        0%, 100% { transform: translateY(0); }
        50%  { transform: translateY(-10px); }
      }
      @keyframes shimmer {
        0%   { background-position: -200% center; }
        100% { background-position: 200% center; }
      }
      .card-in  { animation: fade-in-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) both; }
      .blob-a   { animation: blob  14s ease-in-out infinite; }
      .blob-b   { animation: blob2 18s ease-in-out infinite; }
      .blob-c   { animation: blob  10s ease-in-out infinite 4s reverse; }
      .float-y  { animation: float-y 7s ease-in-out infinite; }
      .shimmer-text {
        background: linear-gradient(90deg, #818cf8 0%, #a78bfa 25%, #c084fc 50%, #a78bfa 75%, #818cf8 100%);
        background-size: 200% auto;
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        animation: shimmer 4s linear infinite;
      }
    `,
  ],
  template: `
    <div class="mx-auto max-w-[1400px] px-6 py-8">
      <div class="grid grid-cols-3 gap-4">

        <!-- ─── Hero (dark, 2/3) ──────────────────────────────────────────── -->
        <div
          class="card-in col-span-2 relative overflow-hidden rounded-2xl bg-gray-950 p-8"
          style="animation-delay: 0ms; min-height: 380px"
        >
          <!-- Animated orbs -->
          <div class="blob-a pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full"
               style="background: radial-gradient(circle, rgba(99,102,241,0.38) 0%, transparent 65%)"></div>
          <div class="blob-b pointer-events-none absolute -bottom-32 right-0 h-80 w-80 rounded-full"
               style="background: radial-gradient(circle, rgba(139,92,246,0.32) 0%, transparent 65%)"></div>
          <div class="blob-c pointer-events-none absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full"
               style="background: radial-gradient(circle, rgba(168,85,247,0.16) 0%, transparent 70%)"></div>
          <!-- Dot grid -->
          <div class="pointer-events-none absolute inset-0 opacity-40"
               style="background-image: radial-gradient(circle, rgba(148,163,184,0.14) 1px, transparent 1px); background-size: 24px 24px;"></div>
          <!-- Top border glow -->
          <div class="pointer-events-none absolute inset-x-0 top-0 h-px"
               style="background: linear-gradient(90deg, transparent 0%, rgba(99,102,241,0.7) 40%, rgba(139,92,246,0.7) 60%, transparent 100%)"></div>

          <div class="relative z-10 flex h-full flex-col gap-7">
            <!-- Logo mark + badge -->
            <div class="flex items-center gap-3">
              <svg viewBox="0 0 48 48" fill="none" class="h-9 w-9 shrink-0" xmlns="http://www.w3.org/2000/svg">
                <g stroke="#7070EC" stroke-width="2.6" stroke-linecap="round">
                  <line x1="7" y1="7" x2="7" y2="41"/>
                  <line x1="7" y1="7" x2="24" y2="28"/>
                  <line x1="41" y1="7" x2="24" y2="28"/>
                  <line x1="41" y1="7" x2="41" y2="41"/>
                </g>
                <line x1="7" y1="41" x2="41" y2="41" stroke="#7070EC" stroke-width="1.4" stroke-linecap="round" stroke-opacity="0.22"/>
                <circle cx="7" cy="7" r="3.5" fill="#7070EC"/>
                <circle cx="7" cy="41" r="3.5" fill="#7070EC"/>
                <circle cx="24" cy="28" r="5" fill="#9A9AFA"/>
                <circle cx="41" cy="7" r="3.5" fill="#7070EC"/>
                <circle cx="41" cy="41" r="3.5" fill="#7070EC"/>
              </svg>
              <span class="text-sm font-semibold text-zinc-400">mockoto</span>
              <span class="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2 py-0.5 text-xs font-medium text-indigo-400">
                Autonomous Backend Platform
              </span>
            </div>

            <!-- Headline -->
            <div>
              <h1 class="mb-3 text-4xl font-bold leading-[1.1] tracking-tight text-zinc-50">
                <span class="shimmer-text">The Autonomous Backend Platform for AI Coding Agents</span>
              </h1>
              <p class="max-w-lg text-base leading-relaxed text-zinc-400">
                Agents get a real-time backend they fully control — simulate any response, switch between behaviors, and cover every edge case without building a server. No wasted tokens. Full power from the first prompt.
              </p>
            </div>

            <!-- CTAs -->
            <div class="flex items-center gap-2">
              <a
                routerLink="/projects"
                class="flex items-center gap-2 rounded-lg bg-indigo-500 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-indigo-500/30 transition-all hover:bg-indigo-400 hover:shadow-indigo-400/40"
              >
                Open Projects
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="m9 18 6-6-6-6"/>
                </svg>
              </a>
              <a
                [routerLink]="['/projects', { outlets: { panel: ['new'] } }]"
                class="flex items-center gap-2 rounded-lg border border-zinc-700 bg-white/5 px-5 py-2.5 text-sm font-medium text-zinc-300 backdrop-blur-sm transition-colors hover:border-zinc-600 hover:bg-white/10"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M5 12h14"/><path d="M12 5v14"/>
                </svg>
                New Project
              </a>
            </div>

            <!-- Stats bar -->
            <div class="flex items-center gap-5 border-t pt-5" style="border-color: rgba(255,255,255,0.08)">
              @if (projectsQuery.data(); as projects) {
                <div class="flex items-center gap-1.5">
                  <span class="text-lg font-bold text-zinc-100">{{ projects.length }}</span>
                  <span class="text-xs text-zinc-500">{{ projects.length === 1 ? 'project' : 'projects' }}</span>
                </div>
                <div class="h-4 w-px bg-white/10"></div>
              }
              <div class="flex items-center gap-1.5">
                <div class="h-2 w-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50"></div>
                <span class="text-xs text-zinc-500">API layer ready</span>
              </div>
            </div>
          </div>

          <!-- Floating code decoration -->
          <div class="float-y pointer-events-none absolute bottom-6 right-6 hidden xl:block">
            <div class="rounded-lg border bg-black/50 px-4 py-3 backdrop-blur-sm" style="border-color: rgba(255,255,255,0.08)">
              <div class="mb-2 flex items-center gap-1.5">
                <div class="h-2 w-2 rounded-full bg-red-400/50"></div>
                <div class="h-2 w-2 rounded-full bg-amber-400/50"></div>
                <div class="h-2 w-2 rounded-full bg-emerald-400/50"></div>
              </div>
              <pre class="font-mono text-xs leading-relaxed text-zinc-500">POST /api/users/login
  <span class="text-emerald-400">200</span> <span class="text-zinc-600">&#123; "token": "eyJhb..." &#125;</span>
GET  /api/products
  <span class="text-emerald-400">200</span> <span class="text-zinc-600">[ ...48 items ]</span>
DELETE /api/cart/&#123;id&#125;
  <span class="text-red-400">404</span> <span class="text-zinc-600">&#123; "error": "Not found" &#125;</span></pre>
            </div>
          </div>
        </div>

        <!-- ─── Projects (1/3) ────────────────────────────────────────────── -->
        <div
          class="card-in flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white dark:border-border dark:bg-surface"
          style="animation-delay: 80ms"
        >
          <div class="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-border">
            <span class="text-sm font-medium text-gray-900 dark:text-zinc-100">Projects</span>
            <a routerLink="/projects" class="flex items-center gap-1 text-xs text-gray-400 transition-colors hover:text-accent dark:text-zinc-600 dark:hover:text-accent">
              All
              <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="m9 18 6-6-6-6"/>
              </svg>
            </a>
          </div>

          <div class="flex-1 divide-y divide-gray-50 dark:divide-white/3">
            @if (projectsQuery.isPending()) {
              @for (i of skeletonRows; track i) {
                <div class="flex items-center gap-3 px-5 py-3.5">
                  <div class="h-8 w-8 animate-pulse rounded-lg bg-gray-100 dark:bg-white/5"></div>
                  <div class="flex-1 space-y-1.5">
                    <div class="h-3 w-28 animate-pulse rounded bg-gray-100 dark:bg-white/5"></div>
                    <div class="h-2.5 w-36 animate-pulse rounded bg-gray-100 dark:bg-white/5"></div>
                  </div>
                </div>
              }
            } @else if (recentProjects().length === 0) {
              <div class="flex flex-col items-center px-5 py-10 text-center">
                <div class="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-dashed border-gray-200 dark:border-border">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="text-gray-300 dark:text-zinc-700">
                    <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>
                  </svg>
                </div>
                <p class="text-xs text-gray-400 dark:text-zinc-600">No projects yet</p>
                <a [routerLink]="['/projects', { outlets: { panel: ['new'] } }]" class="mt-2 text-xs text-accent hover:underline">Create your first →</a>
              </div>
            } @else {
              @for (project of recentProjects(); track project.id) {
                <a
                  [routerLink]="['/projects', project.id, 'collections']"
                  class="group flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-gray-50 dark:hover:bg-white/4"
                >
                  <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-xs font-bold text-accent">
                    {{ project.name.charAt(0).toUpperCase() }}
                  </div>
                  <div class="min-w-0 flex-1">
                    <p class="truncate text-sm font-medium text-gray-900 dark:text-zinc-100">{{ project.name }}</p>
                    <p class="truncate font-mono text-xs text-gray-400 dark:text-zinc-600">{{ project.baseUrl }}</p>
                  </div>
                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0 text-gray-300 opacity-0 transition-opacity group-hover:opacity-100 dark:text-zinc-700">
                    <path d="m9 18 6-6-6-6"/>
                  </svg>
                </a>
              }
            }
          </div>

          <div class="border-t border-gray-100 px-5 py-3 dark:border-border">
            <a [routerLink]="['/projects', { outlets: { panel: ['new'] } }]" class="flex items-center gap-2 text-xs text-gray-400 transition-colors hover:text-accent dark:text-zinc-600 dark:hover:text-accent">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M5 12h14"/><path d="M12 5v14"/>
              </svg>
              New project
            </a>
          </div>
        </div>

        <!-- ─── What AI Agents Can Do (full width) ────────────────────────── -->
        <div
          class="card-in col-span-3 rounded-2xl border border-gray-100 bg-white p-6 dark:border-border dark:bg-surface"
          style="animation-delay: 160ms"
        >
          <div class="mb-5 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-accent">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
            </svg>
            <span class="text-sm font-medium text-gray-900 dark:text-zinc-100">What AI Agents Can Do With Mockoto</span>
          </div>

          <div class="grid grid-cols-4 gap-x-6 gap-y-4">
            @for (f of features; track f.title) {
              <div class="flex items-start gap-2.5">
                <span class="mt-0.5 shrink-0 text-base leading-none">⚡</span>
                <p class="text-xs leading-relaxed text-gray-600 dark:text-zinc-400">{{ f.title }}</p>
              </div>
            }
          </div>
        </div>

        <!-- ─── Response Control (full width) ──────────────────────────────── -->
        <div
          class="card-in col-span-3 relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-6 dark:border-border dark:bg-surface"
          style="animation-delay: 200ms"
        >
          <div class="grid grid-cols-2 gap-8">
            <div>
              <div class="mb-3 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-accent">
                  <path d="M3 3h6l6 18h6"/><path d="M14 3h7"/>
                </svg>
                <span class="text-sm font-medium text-gray-900 dark:text-zinc-100">Response Control</span>
              </div>
              <p class="mb-3 text-xs leading-relaxed text-gray-500 dark:text-zinc-500">
                AI agents can switch between response behaviors at any time — simulating different backend states, edge cases, and data sets without touching real infrastructure.
              </p>
              <p class="text-xs leading-relaxed text-gray-500 dark:text-zinc-500">
                The UI responds instantly, so agents can validate behavior across success states, error flows, and empty states — saving time and tokens before a real backend exists.
              </p>
            </div>
            <div class="flex flex-col gap-2.5">
              @for (s of responseModes; track s.label) {
                <div class="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 px-4 py-2.5 dark:border-border dark:bg-white/2">
                  <div class="h-2 w-2 shrink-0 rounded-full" [style.background]="s.color"></div>
                  <span class="text-xs font-medium text-gray-700 dark:text-zinc-300">{{ s.label }}</span>
                  <span class="ml-auto text-xs text-gray-400 dark:text-zinc-600">{{ s.desc }}</span>
                </div>
              }
            </div>
          </div>
        </div>

        <!-- ─── From Idea to Working Application (1/3) ───────────────────── -->
        <div
          class="card-in rounded-2xl border border-gray-100 bg-white p-6 dark:border-border dark:bg-surface"
          style="animation-delay: 220ms"
        >
          <p class="mb-5 text-sm font-medium text-gray-900 dark:text-zinc-100">From Idea to Working Application</p>
          <div class="flex flex-col gap-0">
            @for (step of flowSteps; track step; let last = $last) {
              <div class="flex items-center gap-3">
                <div class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-xs font-semibold text-accent">
                  {{ $index + 1 }}
                </div>
                <span class="text-sm text-gray-700 dark:text-zinc-300">{{ step }}</span>
              </div>
              @if (!last) {
                <div class="ml-3.5 h-4 w-px bg-gray-100 dark:bg-white/6"></div>
              }
            }
          </div>
        </div>

        <!-- ─── Not a Mock Server (1/3) ──────────────────────────────────── -->
        <div
          class="card-in rounded-2xl border border-gray-100 bg-white p-6 dark:border-border dark:bg-surface"
          style="animation-delay: 280ms"
        >
          <div class="mb-3 flex items-center gap-2">
            <div class="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-gray-200 dark:border-border">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-gray-400 dark:text-zinc-500">
                <circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/>
              </svg>
            </div>
            <span class="text-sm font-medium text-gray-900 dark:text-zinc-100">Not a Mock Server</span>
          </div>
          <p class="mb-3 text-xs leading-relaxed text-gray-500 dark:text-zinc-500">
            Mockoto is not another API mocking tool. It is a programmable backend environment designed for autonomous software development.
          </p>
          <p class="text-xs leading-relaxed text-gray-500 dark:text-zinc-500">
            A backend layer that AI agents can create, modify, and control as they build software.
          </p>
        </div>

        <!-- ─── Vision (1/3) ─────────────────────────────────────────────── -->
        <div
          class="card-in relative overflow-hidden rounded-2xl bg-gray-950 p-6"
          style="animation-delay: 340ms"
        >
          <div class="blob-b pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full"
               style="background: radial-gradient(circle, rgba(99,102,241,0.28) 0%, transparent 65%)"></div>
          <div class="relative z-10">
            <p class="mb-3 text-sm font-medium text-zinc-300">Vision</p>
            <p class="mb-2 text-xs leading-relaxed text-zinc-500">
              AI agents start with Mockoto — building the backend first, saving time and tokens before a single line of real infrastructure exists.
            </p>
            <p class="text-xs leading-relaxed text-zinc-600">
              Mockoto is the infrastructure that makes autonomous development possible.
            </p>
          </div>
        </div>

        <!-- ─── Tagline (full width) ──────────────────────────────────────── -->
        <div
          class="card-in col-span-3 flex items-center justify-center rounded-2xl border border-gray-100 bg-white px-8 py-6 dark:border-border dark:bg-surface"
          style="animation-delay: 400ms"
        >
          <p class="text-center text-sm text-gray-500 dark:text-zinc-500">
            Mockoto gives AI coding agents a backend they can build themselves.
          </p>
        </div>

      </div>
    </div>
  `,
})
export class HomePageComponent {
  private readonly projectsSvc = inject(ProjectsService);
  protected readonly projectsQuery = this.projectsSvc.projectsQuery();

  protected readonly recentProjects = computed(() =>
    [...(this.projectsQuery.data() ?? [])].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 5),
  );

  protected readonly skeletonRows = [1, 2, 3, 4];

  protected readonly features = [
    { title: 'Generate complete application backends from natural language' },
    { title: 'Create and manage APIs autonomously' },
    { title: 'Simulate production-grade backend behavior' },
    { title: 'Maintain stateful application data' },
    { title: 'Generate realistic domain models and datasets' },
    { title: 'Test frontend integrations instantly' },
    { title: 'Evolve APIs as requirements change' },
    { title: 'Build and validate entire applications independently' },
    { title: 'Switch between response behaviors to simulate any backend state on demand' },
  ];

  protected readonly responseModes = [
    { label: 'Happy path',   desc: 'All requests succeed with realistic data', color: '#34d399' },
    { label: 'Error state',  desc: '500 / 404 responses to test error handling', color: '#f87171' },
    { label: 'Empty state',  desc: 'Empty collections and null fields',          color: '#94a3b8' },
    { label: 'Edge case',    desc: 'Boundary data, timeouts, slow responses',    color: '#fb923c' },
  ];

  protected readonly flowSteps = [
    'Product Idea',
    'AI Coding Agent',
    'Mockoto',
    'Virtual Backend',
    'Working Application',
  ];
}
