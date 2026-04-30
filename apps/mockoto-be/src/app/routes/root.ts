import { FastifyInstance } from 'fastify';

export default async function (fastify: FastifyInstance) {
  fastify.get('/hello', async function () {
    return { message: 'Hello API' };
  });
}
