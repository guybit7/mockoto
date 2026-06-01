import { z } from 'zod';
import { jsonValue } from './validators';

export const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'] as const;
export type HttpMethod = (typeof HTTP_METHODS)[number];

export const RuleSchema = z.object({
  id: z.uuid(),
  projectId: z.uuid(),
  collectionId: z.uuid(),
  url: z.string().min(1),
  requestMethod: z.enum(HTTP_METHODS),
  description: z.string().optional(),
  requestBody: jsonValue.optional(),
  lookupHash: z.string(),
  passthrough: z.boolean().default(false),
  type: z.enum(['manual', 'recorded']).optional(),
  isFavorite: z.boolean().default(false),
  isEnabled: z.boolean().default(true),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
});

export const CreateRuleSchema = z.object({
  collectionId: z.uuid(),
  projectId: z.uuid(),
  url: z.string().min(1),
  requestMethod: z.enum(HTTP_METHODS),
  description: z.string().optional(),
  requestBody: jsonValue.optional(),
  passthrough: z.boolean().default(false),
  type: z.enum(['manual', 'recorded']).optional(),
  isFavorite: z.boolean().default(false),
  isEnabled: z.boolean().default(true),
});

export const UpdateRuleSchema = CreateRuleSchema.omit({
  collectionId: true,
  projectId: true,
})
  .partial()
  // Strip defaults so a partial PATCH never silently resets unrelated fields.
  .extend({
    passthrough: z.boolean().optional(),
    isFavorite:  z.boolean().optional(),
    isEnabled:   z.boolean().optional(),
  });

export type Rule = z.infer<typeof RuleSchema>;
export type CreateRuleDto = z.infer<typeof CreateRuleSchema>;
export type UpdateRuleDto = z.infer<typeof UpdateRuleSchema>;
