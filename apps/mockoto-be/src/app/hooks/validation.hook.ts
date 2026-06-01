import { FastifyRequest, FastifyReply } from 'fastify';
import { ZodSchema } from 'zod';
import { ERROR_CODE } from '@mockoto/shared';

export function validateBody<T>(schema: ZodSchema<T>) {
  return async (req: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return reply.code(400).send({
        code:    ERROR_CODE.VALIDATION,
        message: 'Validation failed',
        details: result.error.issues,
      });
    }
    req.body = result.data as unknown;
  };
}
