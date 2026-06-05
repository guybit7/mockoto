import { createHash } from 'crypto';

export function canonicalJson(value: string | null | undefined): string {
  if (!value) return '';
  try {
    return JSON.stringify(JSON.parse(value));
  } catch {
    return value ?? '';
  }
}

export function ruleLookupHash(
  url: string,
  method: string,
  requestBody?: string | null,
): string {
  return createHash('sha256')
    .update(`${url}:${method}:${canonicalJson(requestBody)}`)
    .digest('hex');
}

// Returns true when `pattern` (which may contain :param or * segments) matches `path`.
// Query strings in `path` are ignored.
// Note: `*` matches exactly one segment. Use multiple `:param` names for fixed-depth paths.
export function urlMatchesPattern(pattern: string, path: string): boolean {
  const cleanPath = path.split('?')[0];
  const pParts = pattern.split('/');
  const rParts = cleanPath.split('/');
  if (pParts.length !== rParts.length) return false;
  return pParts.every((seg, i) => seg.startsWith(':') || seg === '*' || seg === rParts[i]);
}

// Higher number = more specific (fewer wildcard segments).
// Used to prefer /users/:id over /* when both match.
export function patternSpecificity(pattern: string): number {
  return pattern.split('/').filter((s) => !s.startsWith(':') && s !== '*').length;
}
