import { z } from 'zod';
import { BaseEntitySchema } from './base.entity';

export const ProjectSchema = BaseEntitySchema.extend({
  description: z.string().optional(),
  baseUrl: z.string().min(1),
  logoBase64: z.string().optional(),
  logoUrl: z.string().optional(),
  isFavorite: z.boolean().default(false),
  ownerName: z.string().optional(),
});

export const CreateProjectSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  baseUrl: z.string().min(1),
  logoBase64: z.string().max(2_000_000).optional(),
  logoUrl: z.string().optional(),
  isFavorite: z.boolean().default(false),
  ownerName: z.string().optional(),
});

export const UpdateProjectSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  baseUrl: z.string().optional(),
  logoBase64: z.string().max(2_000_000).optional(),
  logoUrl: z.string().optional(),
  isFavorite: z.boolean().optional(),
  ownerName: z.string().optional(),
});

export type Project = z.infer<typeof ProjectSchema>;
export type CreateProjectDto = z.infer<typeof CreateProjectSchema>;
export type UpdateProjectDto = z.infer<typeof UpdateProjectSchema>;
