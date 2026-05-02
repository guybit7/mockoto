export function safeParseJson(value?: string | null): unknown {
  if (!value) return undefined;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

export function normalizeJson(value: unknown): string {
  return JSON.stringify(value);
}
