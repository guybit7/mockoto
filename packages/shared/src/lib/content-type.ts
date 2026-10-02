export const DEFAULT_CONTENT_TYPE = 'application/json';

/** Reads the content-type header from a headers object, regardless of key casing. */
export function getContentType(headers: unknown): string | undefined {
  if (headers === null || typeof headers !== 'object') return undefined;
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === 'content-type' && typeof value === 'string') return value;
  }
  return undefined;
}

/** A missing content type counts as JSON — that is what the proxy serves by default. */
export function isJsonContentType(contentType: string | undefined): boolean {
  if (!contentType) return true;
  const mime = contentType.split(';')[0].trim().toLowerCase();
  return mime === 'application/json' || mime.endsWith('+json');
}

/** The media type without parameters, lowercased; missing means the JSON default. */
export function contentTypeMime(headers: unknown): string {
  return (getContentType(headers) ?? DEFAULT_CONTENT_TYPE).split(';')[0].trim().toLowerCase();
}
