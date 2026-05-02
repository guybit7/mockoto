import { z } from 'zod';
import { jsonValue } from './validators';

export const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'] as const;
export type HttpMethod = (typeof HTTP_METHODS)[number];

export const URL_PATTERN_TYPES = ['path-to-regexp', 'regex'] as const;
export type UrlPatternType = (typeof URL_PATTERN_TYPES)[number];

export const RuleSchema = z.object({
  id: z.uuid(),
  projectId: z.uuid(),
  collectionId: z.uuid(),
  url: z.string().min(1),
  urlPatternType: z.enum(URL_PATTERN_TYPES).default('path-to-regexp'),
  requestMethod: z.enum(HTTP_METHODS),
  description: z.string().optional(),
  requestBody: jsonValue.optional(),
  lookupHash: z.string(),
  passthrough: z.boolean().default(false),
  type: z.enum(['manual', 'recorded']).optional(),
  isEnabled: z.boolean().default(true),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
});

export const CreateRuleSchema = z.object({
  collectionId: z.uuid(),
  projectId: z.uuid(),
  url: z.string().min(1),
  urlPatternType: z.enum(URL_PATTERN_TYPES).default('path-to-regexp'),
  requestMethod: z.enum(HTTP_METHODS),
  description: z.string().optional(),
  requestBody: jsonValue.optional(),
  passthrough: z.boolean().default(false),
  type: z.enum(['manual', 'recorded']).optional(),
  isEnabled: z.boolean().default(true),
});

export const UpdateRuleSchema = CreateRuleSchema.omit({
  collectionId: true,
  projectId: true,
}).partial();

export type Rule = z.infer<typeof RuleSchema>;
export type CreateRuleDto = z.infer<typeof CreateRuleSchema>;
export type UpdateRuleDto = z.infer<typeof UpdateRuleSchema>;
