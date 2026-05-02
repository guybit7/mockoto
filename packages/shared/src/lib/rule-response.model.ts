import { z } from 'zod';
import { jsonValue } from './validators';

export const RuleResponseSchema = z.object({
  id: z.uuid(),
  ruleId: z.uuid(),
  name: z.string().optional(),
  isActive: z.boolean().default(false),
  statusCode: z.number().int().min(100).max(599).default(200),
  headers: jsonValue.optional(),
  body: jsonValue.optional(),
  isError: z.boolean().default(false),
  latency: z.number().int().min(0).optional(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
});

export const CreateRuleResponseSchema = z.object({
  ruleId: z.uuid(),
  name: z.string().optional(),
  isActive: z.boolean().default(false),
  statusCode: z.number().int().min(100).max(599).default(200),
  headers: jsonValue.optional(),
  body: jsonValue.optional(),
  isError: z.boolean().default(false),
  latency: z.number().int().min(0).optional(),
});

export const UpdateRuleResponseSchema = CreateRuleResponseSchema.omit({ ruleId: true }).partial();

export type RuleResponse = z.infer<typeof RuleResponseSchema>;
export type CreateRuleResponseDto = z.infer<typeof CreateRuleResponseSchema>;
export type UpdateRuleResponseDto = z.infer<typeof UpdateRuleResponseSchema>;
