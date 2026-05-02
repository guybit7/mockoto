/* eslint-disable @nx/enforce-module-boundaries */
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  CreateCollectionDto,
  UpdateCollectionDto,
  CreateCollectionSchema,
  UpdateCollectionSchema,
} from '@mockoto/shared';
import { CollectionsService } from '../services/collections.service';
import { BaseController } from './base.controller';
import { validateBody } from '../hooks/validation.hook';

export class CollectionsController extends BaseController {
  protected readonly prefix = '/collections';

  constructor(private readonly service: CollectionsService) {
    super();
  }

  protected async routes(fastify: FastifyInstance): Promise<void> {
    fastify.get('/', this.list);

    fastify.get<{ Params: { id: string } }>('/:id', this.getById);

    fastify.post<{ Body: CreateCollectionDto }>('/', {
      preValidation: [validateBody(CreateCollectionSchema)],
      handler: this.create,
    });

    fastify.put<{ Params: { id: string }; Body: UpdateCollectionDto }>('/:id', {
      preValidation: [validateBody(UpdateCollectionSchema)],
      handler: this.update,
    });

    fastify.delete<{ Params: { id: string } }>('/:id', this.remove);

    fastify.get<{ Params: { projectId: string } }>(
      '/project/:projectId/active',
      this.getActive,
    );
  }

  private list = async (_req: FastifyRequest, reply: FastifyReply) => {
    const data = await this.service.findAll();
    return reply.send(data);
  };

  private getById = async (
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) => {
    const data = await this.service.findById(req.params.id);
    return reply.send(data);
  };

  private create = async (
    req: FastifyRequest<{ Body: CreateCollectionDto }>,
    reply: FastifyReply,
  ) => {
    const data = await this.service.create(req.body);
    return reply.code(201).send(data);
  };

  private update = async (
    req: FastifyRequest<{ Params: { id: string }; Body: UpdateCollectionDto }>,
    reply: FastifyReply,
  ) => {
    const data = await this.service.update(req.params.id, req.body);
    return reply.send(data);
  };

  private remove = async (
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) => {
    await this.service.delete(req.params.id);
    return reply.code(204).send();
  };

  private getActive = async (
    req: FastifyRequest<{ Params: { projectId: string } }>,
    reply: FastifyReply,
  ) => {
    const data = await this.service.getActiveCollection(req.params.projectId);
    return reply.send(data);
  };
}
