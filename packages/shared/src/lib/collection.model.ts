import { z } from 'zod';

export const COLLECTION_MODES = ['local', 'proxy'] as const;
export type CollectionMode = (typeof COLLECTION_MODES)[number];

export const RECORDING_STRATEGIES = [
  'none',
  'all',
  'success',
  'error',
] as const;
export type RecordingStrategy = (typeof RECORDING_STRATEGIES)[number];

export const COLLECTION_SOURCES = [
  'manual',
  'recording',
  'har',
  'agent',
] as const;
export type CollectionSource = (typeof COLLECTION_SOURCES)[number];

// --------------------
// Base schema (NO refine here)
// --------------------
const BaseCollectionSchema = z.object({
  projectId: z.uuid(),
  name: z.string().min(1),
  description: z.string().optional(),
  mode: z.enum(COLLECTION_MODES).default('local'),
  recordingStrategy: z.enum(RECORDING_STRATEGIES).default('none'),
  source: z.enum(COLLECTION_SOURCES).optional(),
  isActive: z.boolean().default(false),
  ownerName: z.string().optional(),
});

// --------------------
// Invariant
// --------------------
const modeInvariant = <T extends { mode?: string; recordingStrategy?: string }>(
  val: T,
  ctx: z.RefinementCtx,
) => {
  if (
    val.mode === 'local' &&
    val.recordingStrategy !== undefined &&
    val.recordingStrategy !== 'none'
  ) {
    ctx.addIssue({
      code: 'custom',
      path: ['recordingStrategy'],
      message: "recordingStrategy must be 'none' when mode is 'local'",
    });
  }
};

// --------------------
// Full entity schema
// --------------------
export const CollectionSchema = BaseCollectionSchema.extend({
  id: z.uuid(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
});

// --------------------
// Create
// --------------------
export const CreateCollectionSchema =
  BaseCollectionSchema.superRefine(modeInvariant);

// --------------------
// Update
// --------------------
export const UpdateCollectionSchema = BaseCollectionSchema.omit({
  projectId: true,
}) // MUST be before refine
  .partial()
  .superRefine(modeInvariant);

// --------------------
// Types
// --------------------
export type Collection = z.infer<typeof CollectionSchema>;
export type CreateCollectionDto = z.infer<typeof CreateCollectionSchema>;
export type UpdateCollectionDto = z.infer<typeof UpdateCollectionSchema>;
