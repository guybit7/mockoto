import { FastifyInstance } from 'fastify';
import sensible from './plugins/sensible';

export async function app(fastify: FastifyInstance) {
  await fastify.register(sensible);
}
