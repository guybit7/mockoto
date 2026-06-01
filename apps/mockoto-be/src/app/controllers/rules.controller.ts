import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  CreateRuleDto,
  UpdateRuleDto,
  CreateRuleSchema,
  UpdateRuleSchema,
} from '@mockoto/shared';

import { RulesService } from '../services/rules.service';
import { BaseController } from './base.controller';
import { validateBody } from '../hooks/validation.hook';

export class RulesController extends BaseController {
  protected readonly prefix = '/rules';

  constructor(private readonly service: RulesService) {
    super();
  }

  protected async routes(fastify: FastifyInstance): Promise<void> {
    fastify.get('/', this.list);

    // Static segment before /:id — otherwise "collection" is captured as an id.
    fastify.get<{ Params: { collectionId: string } }>(
      '/collection/:collectionId',
      this.getByCollection,
    );

    fastify.get<{ Params: { id: string } }>('/:id', this.getById);

    fastify.post<{ Body: CreateRuleDto }>('/', {
      preValidation: [validateBody(CreateRuleSchema)],
      handler: this.create,
    });

    fastify.put<{ Params: { id: string }; Body: UpdateRuleDto }>('/:id', {
      preValidation: [validateBody(UpdateRuleSchema)],
      handler: this.update,
    });

    fastify.patch<{ Params: { id: string }; Body: UpdateRuleDto }>('/:id', {
      preValidation: [validateBody(UpdateRuleSchema)],
      handler: this.update,
    });

    fastify.delete<{ Params: { id: string } }>('/:id', this.remove);
  }

  // --------------------
  // Handlers
  // --------------------

  private getByCollection = async (
    req: FastifyRequest<{ Params: { collectionId: string } }>,
    reply: FastifyReply,
  ) => {
    const data = await this.service.findByCollection(req.params.collectionId);
    return reply.send(data);
  };

  private list = async (_req: FastifyRequest, reply: FastifyReply) => {
    const rules = await this.service.findAll();
    return reply.send(rules);
  };

  private getById = async (
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) => {
    const rule = await this.service.findById(req.params.id);
    return reply.send(rule);
  };

  private create = async (
    req: FastifyRequest<{ Body: CreateRuleDto }>,
    reply: FastifyReply,
  ) => {
    const rule = await this.service.create(req.body);
    return reply.code(201).send(rule);
  };

  private update = async (
    req: FastifyRequest<{ Params: { id: string }; Body: UpdateRuleDto }>,
    reply: FastifyReply,
  ) => {
    const rule = await this.service.update(req.params.id, req.body);
    return reply.send(rule);
  };

  private remove = async (
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) => {
    await this.service.delete(req.params.id);
    return reply.code(204).send();
  };
}
