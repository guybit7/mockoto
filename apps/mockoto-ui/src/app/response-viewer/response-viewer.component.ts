import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  signal,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';

const METHOD_CLASS: Record<string, string> = {
  GET:     'bg-emerald-900/50 text-emerald-400',
  POST:    'bg-blue-900/50    text-blue-400',
  PUT:     'bg-amber-900/50   text-amber-400',
  PATCH:   'bg-orange-900/50  text-orange-400',
  DELETE:  'bg-red-900/50     text-red-400',
  HEAD:    'bg-violet-900/50  text-violet-400',
  OPTIONS: 'bg-zinc-800       text-zinc-400',
};

@Component({
  selector: 'mk-response-viewer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  template: `
    <div class="min-h-screen bg-[#09090f] text-[#e4e4e7] font-mono text-[13px] leading-relaxed p-6">
      <div class="max-w-4xl mx-auto">

        <!-- Header -->
        <div class="flex items-center gap-2 mb-4">
          <span class="text-[10px] font-bold tracking-wide px-1.5 py-0.5 rounded"
                [class]="methodClass">{{ method }}</span>
          <span class="text-[#a1a1aa] text-xs truncate">{{ url }}</span>
        </div>

        @if (loading()) {
          <div class="text-[#71717a]">Sending request…</div>
        }

        @if (status() !== null) {
          <div class="flex items-center gap-3 mb-4">
            <span class="font-bold text-sm" [class]="status()! < 400 ? 'text-[#34d399]' : 'text-[#f87171]'">
              {{ status() }}
            </span>
            <span class="text-[#52525b] text-xs">{{ ms() }}ms</span>
          </div>
          <pre class="bg-[#18181b] p-4 rounded-xl whitespace-pre-wrap break-all text-[#e4e4e7]">{{ body() }}</pre>
        }

        @if (errorMsg()) {
          <div class="text-[#f87171]">Error: {{ errorMsg() }}</div>
        }

      </div>
    </div>
  `,
})
export class ResponseViewerComponent implements OnInit {
  protected loading  = signal(true);
  protected status   = signal<number | null>(null);
  protected ms       = signal<number>(0);
  protected body     = signal<string>('');
  protected errorMsg = signal<string | null>(null);

  protected method    = '';
  protected url       = '';
  protected methodClass = '';

  constructor(private readonly route: ActivatedRoute) {}

  ngOnInit(): void {
    const p       = this.route.snapshot.queryParams;
    this.method   = p['method'] ?? 'GET';
    this.url      = p['url']    ?? '';
    this.methodClass = METHOD_CLASS[this.method] ?? 'bg-zinc-800 text-zinc-400';

    const rawBody: string | undefined = p['body'];
    this.sendRequest(this.method, this.url, rawBody ? atob(rawBody) : undefined);
  }

  private async sendRequest(method: string, url: string, body?: string): Promise<void> {
    const t0 = Date.now();
    try {
      const res  = await globalThis.fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        ...(body != null ? { body } : {}),
      });
      const text = await res.text();
      let formatted = text;
      try { formatted = JSON.stringify(JSON.parse(text), null, 2); } catch { /* not JSON */ }

      this.status.set(res.status);
      this.ms.set(Date.now() - t0);
      this.body.set(formatted || '(empty body)');
    } catch (err: unknown) {
      this.errorMsg.set(err instanceof Error ? err.message : String(err));
    } finally {
      this.loading.set(false);
    }
  }
}
