import type { ApiErrorBody } from '@mockoto/shared';

/** Re-export the shared contract so consumers import from one place. */
export type { ApiErrorBody };

/** Shape of the parsed error stored in TanStack Query's `error` signal. */
export interface ApiError {
  status: number;
  body: ApiErrorBody | null;
}
