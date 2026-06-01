import {
  Component,
  computed,
  effect,
  inject,
  input,
  OnDestroy,
  output,
  PLATFORM_ID,
  signal,
  untracked,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { EditorComponent } from 'ngx-monaco-editor-v2';
import { ThemeService } from '@mockoto-ui/core';

export type CodeLanguage = 'json' | 'javascript' | 'typescript' | 'plaintext';

@Component({
  selector: 'mk-code-editor',
  standalone: true,
  imports: [EditorComponent],
  host: { '[class]': 'height() === null ? "flex flex-col" : "block"' },
  template: `
    <div
      [class]="
        height() === null
          ? 'flex flex-1 min-h-0 flex-col gap-1.5'
          : 'flex flex-col gap-1.5'
      "
    >
      @if (label()) {
        <label
          class="shrink-0 text-xs font-medium text-gray-600 dark:text-zinc-400"
          >{{ label() }}</label
        >
      }
      <div
        class="relative overflow-hidden rounded-lg border transition-colors"
        [class]="editorBorderClass()"
        [style.height.px]="height()"
      >
        <ngx-monaco-editor
          class="absolute inset-0"
          [options]="editorOptions()"
          (onInit)="onEditorInit($event)"
        />
      </div>
      @if (hasError()) {
        <span class="shrink-0 text-xs text-red-500 dark:text-red-400">
          {{ error() || 'Invalid JSON' }}
        </span>
      }
    </div>
  `,
})
export class CodeEditorComponent implements OnDestroy {
  readonly label = input('');
  readonly language = input<CodeLanguage>('json');
  readonly readOnly = input(false);
  readonly height = input<number | null>(null);
  readonly error = input('');
  readonly value = input('');

  readonly valueChange = output<string>();
  readonly isValid = output<boolean>();

  protected readonly hasError = signal(false);

  protected readonly editorBorderClass = computed(() => {
    const border = this.hasError()
      ? 'border-red-400 dark:border-red-500'
      : 'border-gray-200 dark:border-border';
    return this.height() === null ? `flex-1 min-h-0 ${border}` : border;
  });

  private validationTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly platformId   = inject(PLATFORM_ID);
  private readonly themeService = inject(ThemeService);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private editor: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private changeDisposable: any = null;
  // True while we are calling editor.setValue() programmatically — suppresses
  // the onDidChangeModelContent callback so we don't echo the value back out.
  private settingValue = false;

  private readonly monacoTheme = computed(() =>
    this.themeService.theme() === 'dark' ? 'vs-dark' : 'vs'
  );

  // Computed so Monaco only receives a new options object when something actually changes.
  protected readonly editorOptions = computed(() => ({
    language: this.language(),
    readOnly: this.readOnly(),
    theme: this.monacoTheme(),
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    fontSize: 12,
    fontFamily:
      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    lineNumbers: 'on' as const,
    renderLineHighlight: 'none' as const,
    overviewRulerBorder: false,
    scrollbar: { vertical: 'auto' as const, horizontal: 'auto' as const },
    padding: { top: 8, bottom: 8 },
    automaticLayout: true,
  }));

  constructor() {
    // Push external value into the editor — but only when it actually differs
    // from what the editor already contains. This prevents cursor-reset loops.
    effect(() => {
      const incoming = this.value();
      if (this.editor && incoming !== (this.editor.getValue() as string)) {
        this.settingValue = true;
        this.editor.setValue(incoming);
        this.settingValue = false;
      }
    });

    effect(() => {
      if (this.error()) this.hasError.set(true);
    });

    // Monaco themes are global — updateOptions() does not propagate theme changes
    // to open editors. Call the global API directly whenever the theme signal changes.
    effect(() => {
      const theme = this.monacoTheme();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).monaco?.editor.setTheme(theme);
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected onEditorInit(editor: any): void {
    this.editor = editor;

    // Set the initial value. The effect above won't have fired yet because
    // `this.editor` was null at that point.
    const initial = untracked(() => this.value());
    if (initial) {
      this.settingValue = true;
      editor.setValue(initial);
      this.settingValue = false;
    }

    // Listen for user edits. We emit the new value and schedule validation.
    // The cursor is never touched here — Monaco keeps its own position.
    this.changeDisposable = editor.onDidChangeModelContent(() => {
      if (this.settingValue) return;
      const val = editor.getValue() as string;
      this.valueChange.emit(val);

      if (this.validationTimer) clearTimeout(this.validationTimer);
      this.validationTimer = setTimeout(() => this.validate(val), 300);
    });
  }

  private validate(val: string): void {
    if (this.language() !== 'json') {
      this.hasError.set(false);
      this.isValid.emit(true);
      return;
    }
    const trimmed = val?.trim();
    if (!trimmed) {
      this.hasError.set(false);
      this.isValid.emit(true);
      return;
    }
    try {
      JSON.parse(trimmed);
      this.hasError.set(false);
      this.isValid.emit(true);
    } catch {
      this.hasError.set(true);
      this.isValid.emit(false);
    }
  }

  ngOnDestroy(): void {
    this.changeDisposable?.dispose();
    if (this.validationTimer) clearTimeout(this.validationTimer);
  }
}
