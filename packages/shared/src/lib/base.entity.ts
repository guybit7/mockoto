import { z } from 'zod';

export const BaseEntitySchema = z.object({
  id: z.uuid(),
  name: z.string().min(1),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
});

export type BaseEntity = z.infer<typeof BaseEntitySchema>;
