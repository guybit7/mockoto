import { getContentType, isJsonContentType } from '@mockoto/shared';

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

// The body column holds exactly what the proxy sends on the wire. JSON responses
// are stored as JSON text; any other content type is stored as the raw string.
export function serializeResponseBody(body: unknown, headers: unknown): string {
  if (typeof body === 'string' && !isJsonContentType(getContentType(headers))) return body;
  return normalizeJson(body);
}

export function parseResponseBody(body: string | null | undefined, headers: unknown): unknown {
  if (!body) return undefined;
  return isJsonContentType(getContentType(headers)) ? safeParseJson(body) : body;
}
