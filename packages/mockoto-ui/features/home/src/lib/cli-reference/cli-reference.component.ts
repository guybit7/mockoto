import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

// ─── interfaces ───────────────────────────────────────────────────────────────

interface CliToken  { text: string; cls: string; }
interface CliOption { flag: string; desc: string; }

interface RawCommand {
  syntax:    string;
  desc:      string;
  note?:     string;
  noteType?: 'warning' | 'danger' | 'info';
  options?:  CliOption[];
}

interface RawSection {
  id:       string;
  label:    string;
  icon:     string;   // full <svg>…</svg> — trusted, hardcoded markup
  commands: RawCommand[];
}

interface CliCommand extends RawCommand {
  tokens:     CliToken[];
  noteClass?: string;
}

interface CliSection {
  id:       string;
  label:    string;
  safeIcon: SafeHtml;
  commands: CliCommand[];
}

// ─── module-level helpers (computed once) ────────────────────────────────────

function buildTokens(syntax: string): CliToken[] {
  const words = syntax.split(' ');
  const solo  = words.length === 1;
  return words.map((word, i) => {
    const text = i < words.length - 1 ? word + ' ' : word;
    if (i === 0)                                      return { text, cls: solo ? 'text-green-400' : 'text-zinc-500' };
    if (word.startsWith('<') || word.startsWith('[')) return { text, cls: 'text-amber-400' };
    if (word.startsWith('-'))                         return { text, cls: 'text-zinc-400' };
    return { text, cls: 'text-green-400' };
  });
}

function buildPillClass(type?: 'warning' | 'danger' | 'info'): string {
  if (type === 'danger')  return 'bg-red-500/10   text-red-600   dark:text-red-400   ring-red-500/20';
  if (type === 'warning') return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-amber-500/20';
  return                         'bg-blue-500/10  text-blue-600  dark:text-blue-400  ring-blue-500/20';
}

function icon(paths: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
}

// ─── raw section data ─────────────────────────────────────────────────────────

const RAW: RawSection[] = [
  {
    id: 'server', label: 'Server',
    icon: icon('<path d="M5 12.55a11 11 0 0 0 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" x2="12" y1="20" y2="20"/>'),
    commands: [
      {
        syntax: 'mockoto',
        desc: 'Start the Mockoto server and proxy. Run from the directory that contains your data folder.',
      },
      {
        syntax: 'mockoto --detach',
        desc: 'Start the Mockoto server in the background — the terminal stays free for other commands. Saves the process ID to ~/.mockoto/mockoto.pid.',
        note: 'Use mockoto stop to stop the background server',
        noteType: 'info',
      },
      {
        syntax: 'mockoto stop',
        desc: 'Stop a background Mockoto server that was started with --detach. Sends SIGTERM to the process and removes the PID file.',
        note: 'Only works when started with --detach',
        noteType: 'warning',
      },
      {
        syntax: 'mockoto open',
        desc: 'Open the Mockoto UI in your default browser.',
        note: 'Requires server to be running',
        noteType: 'warning',
      },
      {
        syntax: 'mockoto --version',
        desc: 'Print the installed Mockoto version.',
      },
    ],
  },
  {
    id: 'diagnostics', label: 'Diagnostics',
    icon: icon('<path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2"/>'),
    commands: [
      {
        syntax: 'mockoto status',
        desc: 'Show whether the server is running, its uptime, port configuration, and data counts across projects, collections, rules, and responses.',
        note: 'Exits 1 if the server is not reachable',
        noteType: 'danger',
      },
      {
        syntax: 'mockoto doctor',
        desc: 'Run environment health checks: Node.js version, storage writability, database presence, and config file validity.',
      },
      {
        syntax: 'mockoto validate',
        desc: 'Check data integrity — detects orphaned records and rules with no responses configured.',
        note: 'Requires server to be running. Exits 1 if issues are found',
        noteType: 'warning',
      },
    ],
  },
  {
    id: 'data', label: 'Data',
    icon: icon('<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/>'),
    commands: [
      {
        syntax: 'mockoto export [output]',
        desc: 'Create a full backup zip of the database and config. Defaults to mockoto-backup-<timestamp>.zip in the current directory.',
        note: 'Run from the directory that contains your data folder',
        noteType: 'info',
      },
      {
        syntax: 'mockoto import <backup>',
        desc: 'Restore from a backup zip created by mockoto export. Prompts for confirmation and saves a rollback snapshot when an existing database is detected.',
      },
      {
        syntax: 'mockoto reset',
        desc: 'Permanently delete all local data (database and WAL files). You must type "reset" to confirm.',
        note: 'This cannot be undone',
        noteType: 'danger',
      },
    ],
  },
  {
    id: 'config', label: 'Configuration',
    icon: icon('<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>'),
    commands: [
      {
        syntax: 'mockoto config show',
        desc: 'Display the current configuration: port, proxy port, and host. Indicates whether values come from a saved config file or built-in defaults.',
      },
      {
        syntax: 'mockoto config set <key> <value>',
        desc: 'Set a configuration value and persist it to ~/.mockoto/config.json.',
        note: 'Restart Mockoto for changes to take effect',
        noteType: 'info',
        options: [
          { flag: 'port',      desc: 'Management server port (1–65535). Default: 3000' },
          { flag: 'proxyPort', desc: 'Proxy server port (1–65535). Default: 3001'      },
          { flag: 'host',      desc: 'Bind address. Default: localhost'                 },
          { flag: 'dataDir',   desc: 'Custom data directory path. Default: ~/.mockoto/data' },
        ],
      },
      {
        syntax: 'mockoto config edit',
        desc: 'Open the config file in your $EDITOR or $VISUAL. Creates a default config if none exists and validates JSON after saving.',
      },
    ],
  },
  {
    id: 'logs', label: 'Logs',
    icon: icon('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><polyline points="10 9 9 9 8 9"/>'),
    commands: [
      {
        syntax: 'mockoto logs',
        desc: 'Display the last 50 lines of the Mockoto log file, formatted with timestamps and log levels (INFO, WARN, ERROR).',
        options: [
          { flag: '-n, --lines <n>', desc: 'Number of lines to show (must be ≥ 1). Default: 50'             },
          { flag: '-f, --follow',    desc: 'Follow log output in real time (like tail -f). Ctrl+C to stop.' },
        ],
      },
      {
        syntax: 'mockoto logs clear',
        desc: 'Delete the Mockoto log file (~/.mockoto/mockoto.log). Useful for freeing disk space or starting a clean log.',
        note: 'This cannot be undone',
        noteType: 'danger',
      },
    ],
  },
];

// ─── component ────────────────────────────────────────────────────────────────

@Component({
  selector: 'mk-cli-reference',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    @keyframes fade-in-up {
      from { opacity: 0; transform: translateY(12px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .page-in    { animation: fade-in-up 0.4s  cubic-bezier(0.16, 1, 0.3, 1) both; }
    .section-in { animation: fade-in-up 0.45s cubic-bezier(0.16, 1, 0.3, 1) both; }
  `],
  template: `
    <div class="mx-auto max-w-5xl px-6 py-10">

      <!-- ── Page header ──────────────────────────────────────────────── -->
      <div class="page-in mb-10 flex flex-wrap items-center justify-between gap-4">
        <div class="flex items-center gap-3">
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-950 shadow-sm dark:bg-zinc-800">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
                 fill="none" stroke="currentColor" stroke-width="1.75"
                 stroke-linecap="round" stroke-linejoin="round" class="text-green-400">
              <polyline points="4 17 10 11 4 5"/><line x1="12" x2="20" y1="19" y2="19"/>
            </svg>
          </div>
          <div>
            <h1 class="text-xl font-semibold tracking-tight text-gray-900 dark:text-zinc-100">CLI Reference</h1>
            <p class="text-sm text-gray-500 dark:text-zinc-500">Control Mockoto from your terminal</p>
          </div>
        </div>

        <!-- Install strip -->
        <div class="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-2.5 dark:border-border dark:bg-surface">
          <span class="select-none font-mono text-xs text-gray-400 dark:text-zinc-600">$</span>
          <code class="font-mono text-sm text-gray-900 dark:text-zinc-100">npm install -g @guybit7/mockoto-cli</code>
          <button
            type="button"
            (click)="copy('npm install -g @guybit7/mockoto-cli')"
            class="ml-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors
                   hover:bg-gray-100 hover:text-gray-700
                   dark:text-zinc-600 dark:hover:bg-white/5 dark:hover:text-zinc-300"
            aria-label="Copy install command"
          >
            @if (copied() === 'npm install -g @guybit7/mockoto-cli') {
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24"
                   fill="none" stroke="currentColor" stroke-width="2.5"
                   stroke-linecap="round" stroke-linejoin="round" class="text-green-400">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            } @else {
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24"
                   fill="none" stroke="currentColor" stroke-width="2"
                   stroke-linecap="round" stroke-linejoin="round">
                <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
                <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
              </svg>
            }
          </button>
        </div>
      </div>

      <!-- ── Sections ─────────────────────────────────────────────────── -->
      @for (section of sections; track section.id; let idx = $index) {
        <section class="section-in mb-8" [style.animation-delay]="idx * 60 + 'ms'">

          <!-- Section header -->
          <div class="mb-3 flex items-center gap-2.5 border-l-2 border-accent pl-3">
            <span class="shrink-0 text-gray-400 dark:text-zinc-500"
                  [innerHTML]="section.safeIcon"></span>
            <h2 class="text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-zinc-400">
              {{ section.label }}
            </h2>
          </div>

          <!-- Command table -->
          <div class="overflow-hidden rounded-xl border border-gray-200 dark:border-border">
            @for (cmd of section.commands; track cmd.syntax; let last = $last) {
              <div class="group flex flex-col md:flex-row"
                   [class]="!last ? 'border-b border-gray-100 dark:border-border' : ''">

                <!-- LEFT — command -->
                <div class="flex items-center justify-between gap-3
                            bg-zinc-950 px-5 py-4
                            transition-colors group-hover:bg-zinc-900
                            dark:bg-zinc-900/60 dark:group-hover:bg-zinc-900
                            md:w-[340px] md:shrink-0 md:border-r md:border-zinc-800">

                  <div class="flex min-w-0 items-center gap-2">
                    <span class="shrink-0 select-none font-mono text-xs text-zinc-600">$</span>
                    <code class="whitespace-pre font-mono text-sm">@for (token of cmd.tokens; track $index) {<span [class]="token.cls">{{ token.text }}</span>}</code>
                  </div>

                  <button
                    type="button"
                    (click)="copy(cmd.syntax)"
                    class="flex h-6 w-6 shrink-0 items-center justify-center rounded-md
                           text-zinc-700 opacity-0 transition-all
                           focus-visible:opacity-100
                           group-hover:opacity-100
                           hover:bg-white/8 hover:text-zinc-300"
                    aria-label="Copy command"
                  >
                    @if (copied() === cmd.syntax) {
                      <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24"
                           fill="none" stroke="currentColor" stroke-width="2.5"
                           stroke-linecap="round" stroke-linejoin="round" class="text-green-400">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    } @else {
                      <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24"
                           fill="none" stroke="currentColor" stroke-width="2"
                           stroke-linecap="round" stroke-linejoin="round">
                        <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
                        <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
                      </svg>
                    }
                  </button>
                </div>

                <!-- RIGHT — description + note + options -->
                <div class="flex-1 bg-white px-6 py-4
                            transition-colors group-hover:bg-gray-50
                            dark:bg-surface dark:group-hover:bg-white/2">

                  <p class="text-sm leading-relaxed text-gray-700 dark:text-zinc-300">{{ cmd.desc }}</p>

                  @if (cmd.note) {
                    <span class="mt-2 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset"
                          [class]="cmd.noteClass">
                      <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24"
                           fill="none" stroke="currentColor" stroke-width="2.5"
                           stroke-linecap="round" stroke-linejoin="round">
                        @if (cmd.noteType === 'danger') {
                          <!-- AlertTriangle -->
                          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
                          <path d="M12 9v4"/><path d="M12 17h.01"/>
                        } @else if (cmd.noteType === 'warning') {
                          <!-- AlertCircle -->
                          <circle cx="12" cy="12" r="10"/>
                          <line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>
                        } @else {
                          <!-- Info — dot at top, bar at bottom -->
                          <circle cx="12" cy="12" r="10"/>
                          <path d="M12 16v-4"/><path d="M12 8h.01"/>
                        }
                      </svg>
                      {{ cmd.note }}
                    </span>
                  }

                  @if (cmd.options?.length) {
                    <div class="mt-3 border-t border-gray-100 pt-3 dark:border-border">
                      <p class="mb-2.5 text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-zinc-600">
                        Options
                      </p>
                      <div class="flex flex-col gap-3">
                        @for (opt of cmd.options; track opt.flag) {
                          <div class="flex items-start gap-3">
                            <code class="shrink-0 whitespace-nowrap rounded-md bg-gray-100 px-2 py-0.5 font-mono text-xs text-gray-700 dark:bg-white/5 dark:text-zinc-300">
                              {{ opt.flag }}
                            </code>
                            <span class="text-xs leading-relaxed text-gray-500 dark:text-zinc-500">{{ opt.desc }}</span>
                          </div>
                        }
                      </div>
                    </div>
                  }

                </div>
              </div>
            }
          </div>

        </section>
      }

    </div>
  `,
})
export class CliReferenceComponent {
  private  readonly san     = inject(DomSanitizer);
  protected readonly copied = signal<string | null>(null);

  /** Pre-processed sections: tokens and pill classes computed once at construction. */
  protected readonly sections: CliSection[] = RAW.map(s => ({
    id:       s.id,
    label:    s.label,
    safeIcon: this.san.bypassSecurityTrustHtml(s.icon),
    commands: s.commands.map(cmd => ({
      ...cmd,
      tokens:    buildTokens(cmd.syntax),
      noteClass: cmd.note ? buildPillClass(cmd.noteType) : undefined,
    })),
  }));

  protected copy(text: string): void {
    navigator.clipboard?.writeText(text)
      .then(() => {
        this.copied.set(text);
        setTimeout(() => this.copied.set(null), 2000);
      })
      .catch(() => { /* clipboard unavailable — button stays in default state */ });
  }
}
