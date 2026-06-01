// Typed error codes shared by both the API (response body) and the frontend
// (HTTP error parsing). Never match on arbitrary strings — use these constants.

export const ERROR_CODE = {
  NOT_FOUND:  'NOT_FOUND',
  CONFLICT:   'CONFLICT',
  VALIDATION: 'VALIDATION_ERROR',
  INTERNAL:   'INTERNAL_SERVER_ERROR',
} as const;

export type ErrorCode = (typeof ERROR_CODE)[keyof typeof ERROR_CODE];

/** Shape of every error body the API sends. */
export interface ApiErrorBody {
  code: ErrorCode;
  message: string;
  details?: unknown[];
}
