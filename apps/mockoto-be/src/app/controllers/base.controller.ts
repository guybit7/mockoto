import { FastifyInstance } from 'fastify';

export abstract class BaseController {
  protected abstract readonly prefix: string;

  async register(fastify: FastifyInstance): Promise<void> {
    fastify.register(async (instance) => this.routes(instance), {
      prefix: this.prefix,
    });
  }

  protected abstract routes(fastify: FastifyInstance): Promise<void>;
}
