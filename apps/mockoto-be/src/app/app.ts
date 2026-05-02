import { FastifyInstance } from 'fastify';
import sensible from './plugins/sensible';
import { NotFoundError } from './errors';

export async function app(fastify: FastifyInstance) {
  await fastify.register(sensible);

  fastify.setErrorHandler((error, _request, reply) => {
    if (error instanceof NotFoundError) {
      return reply.code(404).send({ message: error.message });
    }
    return reply.code(500).send({ message: 'Internal server error' });
  });
}
