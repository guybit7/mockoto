import { FastifyRequest, FastifyReply } from 'fastify';
import { ZodSchema } from 'zod';

export function validateBody<T>(schema: ZodSchema<T>) {
  return async (req: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      reply.code(400).send({
        message: 'Validation failed',
        errors: result.error.flatten().fieldErrors,
      });
    } else {
      req.body = result.data as unknown;
    }
  };
}
