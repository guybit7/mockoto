import { type ApiErrorBody, ERROR_CODE } from '@mockoto/shared';

// ─── Domain errors ────────────────────────────────────────────────────────────
// Throw these from services; the global error handler in main.ts converts them
// to HTTP responses that match ApiErrorBody exactly.

export class NotFoundError extends Error {
  readonly code = ERROR_CODE.NOT_FOUND;
  constructor(entity: string, id: string) {
    super(`${entity} with id "${id}" not found`);
    this.name = 'NotFoundError';
  }
  toResponse(): ApiErrorBody {
    return { code: this.code, message: this.message };
  }
}

// Thrown when a project has no active collection. Semantically distinct from
// "collection with id X not found" — no ID is involved, just missing state.
export class NoActiveCollectionError extends Error {
  readonly code = ERROR_CODE.NOT_FOUND;
  constructor(projectId: string) {
    super(`Project "${projectId}" has no active collection`);
    this.name = 'NoActiveCollectionError';
  }
  toResponse(): ApiErrorBody {
    return { code: this.code, message: this.message };
  }
}

export class ConflictError extends Error {
  readonly code = ERROR_CODE.CONFLICT;
  readonly existing?: unknown;
  constructor(message: string, existing?: unknown) {
    super(message);
    this.name = 'ConflictError';
    this.existing = existing;
  }
  toResponse(): ApiErrorBody & { existing?: unknown } {
    return {
      code: this.code,
      message: this.message,
      ...(this.existing !== undefined ? { existing: this.existing } : {}),
    };
  }
}

// Thrown when a rule insert/update violates the unique (collectionId, lookupHash) index.
export class DuplicateRuleError extends ConflictError {
  constructor(existing?: unknown) {
    super('A rule for this URL + method + body already exists in the collection', existing);
    this.name = 'DuplicateRuleError';
  }
}

export class ValidationError extends Error {
  readonly code = ERROR_CODE.VALIDATION;
  constructor(message: string, readonly details?: unknown[]) {
    super(message);
    this.name = 'ValidationError';
  }
  toResponse(): ApiErrorBody {
    return {
      code: this.code,
      message: this.message,
      ...(this.details ? { details: this.details } : {}),
    };
  }
}
