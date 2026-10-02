import {
  Component,
  computed,
  effect,
  inject,
  input,
  linkedSignal,
  output,
  signal,
  untracked,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonComponent, CodeEditorComponent, InputComponent } from '@mockoto-ui/design-system';
import type { CodeLanguage } from '@mockoto-ui/design-system';
import { DEFAULT_CONTENT_TYPE, getContentType, isJsonContentType } from '@mockoto/shared';
import { ShortcutAware } from '@mockoto-ui/core';
import { ResponsesService } from '../responses.service';

const PAYLOAD_METHODS = new Set(['POST', 'PUT', 'DELETE', 'PATCH']);

const CONTENT_TYPES: { value: string; label: string; language: CodeLanguage }[] = [
  { value: DEFAULT_CONTENT_TYPE, label: 'JSON', language: 'json' },
  { value: 'text/plain',         label: 'Text', language: 'plaintext' },
  { value: 'application/xml',    label: 'XML',  language: 'xml' },
  { value: 'text/html',          label: 'HTML', language: 'html' },
];

// Maps any content type (e.g. a recorded "text/xml; charset=utf-8") to an editor language.
function languageFor(contentType: string): CodeLanguage {
  if (isJsonContentType(contentType)) return 'json';
  const mime = contentType.split(';')[0].toLowerCase();
  if (mime.includes('html')) return 'html';
  if (mime.includes('xml')) return 'xml';
  return 'plaintext';
}

interface ShortcutItem<T> {
  value: T;
  label: string;
  classes: string;
}

@Component({
  selector: 'mk-response-inline-form',
  standalone: true,
  imports: [FormsModule, ButtonComponent, InputComponent, CodeEditorComponent],
  host: { '[class]': 'hostClass()' },
  template: `
    <!-- Toolbar: star + name -->
    <div class="flex shrink-0 items-center gap-2 border-b border-gray-100 px-4 py-2 dark:border-border">
      <button
        type="button"
        (click)="toggleFavorite()"
        [disabled]="mode() === 'create'"
        [title]="isFavorite() ? 'Remove from favorites' : 'Add to favorites'"
        [attr.aria-label]="isFavorite() ? 'Remove from favorites' : 'Add to favorites'"
        class="flex h-6 w-6 shrink-0 items-center justify-center rounded transition-colors disabled:hidden"
        [class]="isFavorite()
          ? 'text-amber-400 hover:text-amber-500'
          : 'text-gray-300 hover:text-amber-300 dark:text-zinc-600 dark:hover:text-amber-400'"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24"
             [attr.fill]="isFavorite() ? 'currentColor' : 'none'"
             stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
      </button>
      <mk-input class="flex-1" [(value)]="name" placeholder="Response name" />
    </div>

    <!-- Controls bar: Status + Delay — full-width, never clipped by split resize -->
    <div class="flex shrink-0 items-center gap-3 border-b border-gray-100 bg-gray-50/60 px-4 py-2 dark:border-border dark:bg-white/2">

      <!-- Status -->
      <div class="flex items-center gap-2">
        <span class="text-xs text-gray-400 dark:text-zinc-500">Status</span>
        <input
          type="number"
          [value]="statusCode()"
          (input)="onStatusInput($event)"
          placeholder="200"
          class="h-7 w-16 rounded-lg border bg-transparent px-2 text-center font-mono text-xs text-gray-800 outline-none transition-colors placeholder:text-gray-300 focus:ring-1 dark:text-zinc-200 dark:placeholder:text-zinc-600"
          [class]="statusInputClasses()"
        />
        <div class="flex overflow-hidden rounded-lg border border-gray-200 dark:border-zinc-700">
          @for (item of statusShortcutItems(); track item.value) {
            <button type="button" (click)="setStatusShortcut(item.value)"
              class="px-2 py-1 text-xs font-mono font-semibold transition-colors"
              [class.border-r]="!$last"
              [class.border-gray-200]="!$last"
              [class.dark:border-zinc-700]="!$last"
              [class]="item.classes"
            >{{ item.label }}</button>
          }
        </div>
      </div>

      <div class="h-4 w-px bg-gray-200 dark:bg-zinc-700"></div>

      <!-- Delay -->
      <div class="flex items-center gap-2">
        <span class="text-xs text-gray-400 dark:text-zinc-500">Delay</span>
        <input
          type="number" step="1" min="0"
          [value]="latency()"
          (input)="onLatencyInput($event)"
          placeholder="0"
          class="h-7 w-14 rounded-lg border border-gray-200 bg-transparent px-2 text-center font-mono text-xs text-gray-800 outline-none transition-colors placeholder:text-gray-300 focus:border-violet-400 focus:ring-1 focus:ring-violet-400/20 dark:border-zinc-700 dark:text-zinc-200 dark:placeholder:text-zinc-600 dark:focus:border-violet-500"
        />
        <div class="flex overflow-hidden rounded-lg border border-gray-200 dark:border-zinc-700">
          @for (item of latencyShortcutItems(); track item.value) {
            <button type="button" (click)="setLatencyShortcut(item.value)"
              class="px-2 py-1 text-xs font-mono font-semibold transition-colors"
              [class.border-r]="!$last"
              [class.border-gray-200]="!$last"
              [class.dark:border-zinc-700]="!$last"
              [class]="item.classes"
            >{{ item.label }}</button>
          }
        </div>
      </div>

      <div class="h-4 w-px bg-gray-200 dark:bg-zinc-700"></div>

      <!-- Content type -->
      <div class="flex items-center gap-2">
        <span class="text-xs text-gray-400 dark:text-zinc-500">Type</span>
        <div class="flex overflow-hidden rounded-lg border border-gray-200 dark:border-zinc-700"
             [title]="mode() === 'edit' ? contentType() + ' — the type is set when the response is created' : contentType()">
          @for (item of contentTypeItems(); track item.value) {
            <button type="button" (click)="setContentType(item.value)"
              [disabled]="mode() === 'edit'"
              class="px-2 py-1 text-xs font-mono font-semibold transition-colors disabled:cursor-not-allowed"
              [class.opacity-40]="mode() === 'edit' && bodyLanguage() !== item.language"
              [class.border-r]="!$last"
              [class.border-gray-200]="!$last"
              [class.dark:border-zinc-700]="!$last"
              [class]="item.classes"
            >{{ item.label }}</button>
          }
        </div>
      </div>

    </div>

    <!-- Editors -->
    <div class="flex min-h-0 flex-1 gap-4 px-4 py-3">

      @if (hasPayload()) {
        <div class="flex min-h-0 min-w-0 flex-1 flex-col">
          <mk-code-editor
            class="flex-1 min-h-0"
            label="Request Body"
            language="json"
            [height]="null"
            [error]="payloadError()"
            [value]="payload()"
            (valueChange)="payload.set($event)"
            (isValid)="payloadError.set($event ? '' : 'Invalid JSON')"
          />
        </div>
      }

      <div class="flex min-h-0 min-w-0 flex-1 flex-col">
        <mk-code-editor
          class="flex-1 min-h-0"
          label="Response Body"
          [language]="bodyLanguage()"
          [height]="null"
          [error]="bodyError()"
          [value]="body()"
          (valueChange)="body.set($event)"
          (isValid)="bodyError.set($event ? '' : 'Invalid JSON')"
        />
      </div>

    </div>

    <!-- Footer: delete + save -->
    <div class="flex shrink-0 items-center border-t border-gray-100 px-4 py-2 dark:border-border">

      @if (mode() === 'edit') {
        @if (deleteConfirming()) {
          <span class="text-xs text-gray-500 dark:text-zinc-400">Delete this response?</span>
          <mk-button variant="secondary" size="sm" type="button" (click)="deleteConfirming.set(false)" class="ml-2">Cancel</mk-button>
          <mk-button variant="danger" size="sm" type="button" (click)="delete()" class="ml-1.5">Delete</mk-button>
        } @else {
          <button
            type="button"
            (click)="deleteConfirming.set(true)"
            title="Delete response"
            class="flex h-7 items-center gap-1.5 rounded px-2 text-xs text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:text-zinc-500 dark:hover:bg-red-500/10 dark:hover:text-red-400"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
            </svg>
            Delete
          </button>
        }
      }

      <mk-button class="ml-auto" size="sm" type="button" (click)="save()" [disabled]="saving()">
        @if (saving()) {
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="animate-spin">
            <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
          </svg>
        } @else {
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
            <polyline points="17 21 17 13 7 13 7 21"/>
            <polyline points="7 3 7 8 15 8"/>
          </svg>
        }
        {{ saving() ? 'Saving…' : 'Save' }}
      </mk-button>
    </div>
  `,
})
export class ResponseInlineFormComponent extends ShortcutAware {
  readonly id              = input<string | null>(null);
  readonly ruleId          = input('');
  readonly projectId       = input('');
  readonly collectionId    = input('');
  readonly requestMethod   = input('');
  readonly requestBodyJson = input('');
  readonly saved           = output<string>();
  readonly payloadSave     = output<unknown>();
  readonly deleteRequested = output<string>();

  private readonly svc        = inject(ResponsesService);
  private readonly dataQuery  = this.svc.responseQuery(() => this.id());
  private readonly createMut  = this.svc.createMutation();
  private readonly updateMut  = this.svc.updateMutation();

  protected readonly mode      = computed(() => this.id() ? 'edit' : 'create');
  protected readonly hostClass = computed(() => {
    const isCreate = this.mode() === 'create';
    return `flex h-full flex-col transition-colors ${
      isCreate
        ? 'border border-emerald-400 dark:border-emerald-500'
        : 'border-l border-gray-200 dark:border-border'
    }`;
  });
  protected readonly hasPayload = computed(() => PAYLOAD_METHODS.has(this.requestMethod()));

  // ── Form fields — linkedSignal resets each field when id() changes ────────

  protected readonly name       = linkedSignal<string>(() => { this.id(); return ''; });
  protected readonly statusCode = linkedSignal<string>(() => { this.id(); return '200'; });
  protected readonly latency    = linkedSignal<string>(() => { this.id(); return ''; });
  protected readonly body       = linkedSignal<string>(() => { this.id(); return ''; });
  protected readonly contentType = linkedSignal<string>(() => { this.id(); return DEFAULT_CONTENT_TYPE; });
  protected readonly payload    = linkedSignal<string>(() => { this.id(); return untracked(() => this.requestBodyJson()); });
  protected readonly isActive   = linkedSignal<boolean>(() => { this.id(); return false; });
  protected readonly isFavorite = linkedSignal<boolean>(() => { this.id(); return false; });

  protected readonly statusCodeError  = signal('');
  protected readonly bodyError        = signal('');
  protected readonly payloadError     = signal('');
  protected readonly saving           = signal(false);
  protected readonly deleteConfirming = linkedSignal<boolean>(() => { this.id(); return false; });

  private populatedAt = 0;

  // ── Computed shortcut items — no function calls in template ───────────────

  private readonly statusCodes   = [200, 404, 500] as const;
  private readonly latencyValues = [0, 2, 5, 10]   as const;

  protected readonly statusShortcutItems = computed<ShortcutItem<number>[]>(() =>
    this.statusCodes.map(code => ({
      value: code,
      label: String(code),
      classes: this.resolveStatusButtonClasses(code, this.statusCode() === String(code)),
    }))
  );

  protected readonly latencyShortcutItems = computed<ShortcutItem<number>[]>(() =>
    this.latencyValues.map(s => ({
      value: s,
      label: `${s}s`,
      classes: this.latency() === String(s)
        ? 'bg-zinc-700 text-zinc-100 dark:bg-zinc-200 dark:text-zinc-900'
        : 'bg-transparent text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-zinc-400 dark:hover:bg-zinc-800',
    }))
  );

  protected readonly bodyLanguage = computed<CodeLanguage>(() => languageFor(this.contentType()));

  protected readonly contentTypeItems = computed<(ShortcutItem<string> & { language: CodeLanguage })[]>(() =>
    CONTENT_TYPES.map(type => ({
      value: type.value,
      label: type.label,
      language: type.language,
      classes: this.bodyLanguage() === type.language
        ? 'bg-zinc-700 text-zinc-100 dark:bg-zinc-200 dark:text-zinc-900'
        : 'bg-transparent text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-zinc-400 dark:hover:bg-zinc-800',
    }))
  );

  protected readonly statusInputClasses = computed<string>(() => {
    if (this.statusCodeError()) {
      return 'border-red-400 focus:ring-red-400/30 dark:border-red-500 dark:focus:ring-red-500/30';
    }
    const code = parseInt(this.statusCode(), 10);
    if (!isNaN(code)) {
      if (code >= 500) return 'border-red-200 focus:border-red-400 focus:ring-red-400/20 dark:border-red-900 dark:focus:border-red-600';
      if (code >= 400) return 'border-orange-200 focus:border-orange-400 focus:ring-orange-400/20 dark:border-orange-900 dark:focus:border-orange-600';
      if (code >= 200 && code < 300) return 'border-emerald-200 focus:border-emerald-400 focus:ring-emerald-400/20 dark:border-emerald-900 dark:focus:border-emerald-600';
    }
    return 'border-gray-200 focus:border-violet-400 focus:ring-violet-400/20 dark:border-zinc-700 dark:focus:border-violet-500';
  });

  constructor() {
    super();

    // Populate from server when (new) data arrives — effect is required because
    // data arrives asynchronously after the query key changes.
    effect(() => {
      const id   = this.id();
      const data = this.dataQuery.data();
      if (!data || data.id !== id || data.updatedAt <= this.populatedAt) return;
      this.populatedAt = data.updatedAt;
      untracked(() => {
        this.name.set(data.name ?? '');
        this.statusCode.set(String(data.statusCode));
        this.latency.set(data.latency != null ? String(data.latency / 1000) : '');
        const contentType = getContentType(data.headers) ?? DEFAULT_CONTENT_TYPE;
        this.contentType.set(contentType);
        this.body.set(this.formatBody(data.body, contentType));
        this.isActive.set(data.isActive);
        this.isFavorite.set(data.isFavorite);
      });
    });

    // Reset populatedAt when the edited response changes (non-signal side effect).
    effect(() => { this.id(); this.populatedAt = 0; });
  }

  private resolveStatusButtonClasses(code: number, isSelected: boolean): string {
    if (code >= 500) return isSelected
      ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300'
      : 'bg-transparent text-red-400 hover:bg-red-50 hover:text-red-600 dark:text-red-500/60 dark:hover:bg-red-500/10 dark:hover:text-red-400';
    if (code >= 400) return isSelected
      ? 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300'
      : 'bg-transparent text-orange-400 hover:bg-orange-50 hover:text-orange-600 dark:text-orange-500/60 dark:hover:bg-orange-500/10 dark:hover:text-orange-400';
    return isSelected
      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
      : 'bg-transparent text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-zinc-500 dark:hover:bg-zinc-700/60 dark:hover:text-zinc-300';
  }

  private parseJson(raw: string): { value: unknown; error: string } {
    const trimmed = raw.trim();
    if (!trimmed) return { value: undefined, error: '' };
    try { return { value: JSON.parse(trimmed), error: '' }; }
    catch { return { value: null, error: 'Invalid JSON' }; }
  }

  // Non-JSON bodies are shown and saved as the raw text.
  private formatBody(body: unknown, contentType: string): string {
    if (body == null) return '';
    if (typeof body === 'string' && !isJsonContentType(contentType)) return body;
    return JSON.stringify(body, null, 2);
  }

  private parseBody(raw: string): { value: unknown; error: string } {
    // An empty editor is sent as null so clearing the body is saved.
    if (raw.trim() === '') return { value: null, error: '' };
    if (isJsonContentType(this.contentType())) return this.parseJson(raw);
    return { value: raw, error: '' };
  }

  // The content type is fixed at creation, so headers are only sent when creating.
  private headersForCreate(): Record<string, unknown> | undefined {
    if (this.contentType() === DEFAULT_CONTENT_TYPE) return undefined;
    return { 'content-type': this.contentType() };
  }

  protected setContentType(contentType: string): void {
    if (this.mode() === 'edit') return;
    this.contentType.set(contentType);
    this.bodyError.set('');
  }

  protected onStatusInput(e: Event): void {
    this.statusCode.set((e.target as HTMLInputElement).value);
    this.statusCodeError.set('');
  }

  protected onLatencyInput(e: Event): void {
    this.latency.set((e.target as HTMLInputElement).value);
  }

  protected async setStatusShortcut(code: number): Promise<void> {
    this.statusCode.set(String(code));
    if (this.mode() === 'edit') await this.save();
  }

  protected async setLatencyShortcut(s: number): Promise<void> {
    this.latency.set(String(s));
    if (this.mode() === 'edit') await this.save();
  }

  protected async save(): Promise<void> {
    this.statusCodeError.set('');
    this.bodyError.set('');
    this.payloadError.set('');

    const code = parseInt(this.statusCode(), 10);
    if (isNaN(code) || code < 100 || code > 599) {
      this.statusCodeError.set('Must be 100–599');
      return;
    }

    const parsedBody = this.parseBody(this.body());
    if (parsedBody.error) { this.bodyError.set(parsedBody.error); return; }

    let parsedPayload: { value: unknown; error: string } = { value: undefined, error: '' };
    if (this.hasPayload()) {
      parsedPayload = this.parseJson(this.payload());
      if (parsedPayload.error) { this.payloadError.set(parsedPayload.error); return; }
    }

    const latencyRaw = this.latency().trim();
    const latency    = latencyRaw !== '' ? Math.round(parseFloat(latencyRaw) * 1000) : undefined;

    this.saving.set(true);
    try {
      const currentId = this.id();
      let savedId: string;
      if (currentId) {
        await this.updateMut.mutateAsync({
          id: currentId,
          dto: {
            name:       this.name() || undefined,
            statusCode: code,
            latency,
            body:       parsedBody.value,
            isActive:   this.isActive(),
            isFavorite: this.isFavorite(),
            isError:    code >= 400,
          },
        });
        savedId = currentId;
      } else {
        const headers = this.headersForCreate();
        const created = await this.createMut.mutateAsync({
          ruleId:     this.ruleId(),
          name:       this.name() || undefined,
          statusCode: code,
          latency,
          body:       parsedBody.value,
          ...(headers && { headers }),
          isActive:   true,
          isFavorite: this.isFavorite(),
          isError:    code >= 400,
        });
        savedId = created.id;
      }
      if (this.hasPayload() && this.payload() !== this.requestBodyJson()) this.payloadSave.emit(parsedPayload.value);
      this.saved.emit(savedId);
    } finally {
      this.saving.set(false);
    }
  }

  protected delete(): void {
    const currentId = this.id();
    if (!currentId) return;
    this.deleteConfirming.set(false);
    this.deleteRequested.emit(currentId);
  }

  protected toggleFavorite(): void {
    const currentId = this.id();
    if (!currentId) return;
    const next = !this.isFavorite();
    this.isFavorite.set(next);
    this.updateMut.mutate({ id: currentId, dto: { isFavorite: next } });
  }
}
