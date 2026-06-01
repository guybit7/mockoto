import { isNotFound, isServerError } from './http/query-error.utils';

/** Distinct async view states — never conflate empty, not-found, and error. */
export type QueryViewStatus =
  | 'loading'
  | 'error'
  | 'not-found'
  | 'empty'
  | 'ready';

export interface QueryLike<T> {
  isPending: () => boolean;
  isError: () => boolean;
  error: () => unknown;
  data: () => T | undefined;
}

/**
 * Derive a single view status from a TanStack Query result.
 *
 * @param query   TanStack query (or compatible object)
 * @param isEmpty Optional predicate — when data is defined and returns true → 'empty'
 */
export function queryViewStatus<T>(
  query: QueryLike<T>,
  isEmpty?: (data: T) => boolean,
): QueryViewStatus {
  if (query.isPending()) return 'loading';
  if (query.isError()) {
    return isNotFound(query.error()) ? 'not-found' : 'error';
  }
  const data = query.data();
  if (data !== undefined && isEmpty?.(data)) return 'empty';
  return 'ready';
}

/** Map a single-entity query to panel gate status (empty → not-found). */
export function panelEntityStatus<T>(query: QueryLike<T>): Exclude<QueryViewStatus, 'empty'> {
  const status = queryViewStatus(query);
  if (status === 'empty') return 'not-found';
  return status;
}

/** True when the failure is a server/network error (5xx or offline). */
export function isQueryServerError(query: QueryLike<unknown>): boolean {
  return query.isError() && isServerError(query.error());
}
