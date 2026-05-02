import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  CreateRuleResponseDto,
  UpdateRuleResponseDto,
  CreateRuleResponseSchema,
  UpdateRuleResponseSchema,
} from '@mockoto/shared';

import { RuleResponsesService } from '../services/rule-responses.service';
import { BaseController } from './base.controller';
import { validateBody } from '../hooks/validation.hook';

export class RuleResponsesController extends BaseController {
  protected readonly prefix = '/rule-responses';

  constructor(private readonly service: RuleResponsesService) {
    super();
  }

  protected async routes(fastify: FastifyInstance): Promise<void> {
    fastify.get('/', this.list);

    fastify.get<{ Params: { id: string } }>('/:id', this.getById);

    // 🔥 חשוב: כל התשובות של rule
    fastify.get<{ Params: { ruleId: string } }>(
      '/rule/:ruleId',
      this.getByRuleId,
    );

    fastify.post<{ Body: CreateRuleResponseDto }>('/', {
      preValidation: [validateBody(CreateRuleResponseSchema)],
      handler: this.create,
    });

    fastify.put<{ Params: { id: string }; Body: UpdateRuleResponseDto }>(
      '/:id',
      {
        preValidation: [validateBody(UpdateRuleResponseSchema)],
        handler: this.update,
      },
    );

    fastify.delete<{ Params: { id: string } }>('/:id', this.remove);
  }

  // --------------------
  // Handlers
  // --------------------

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

  private getByRuleId = async (
    req: FastifyRequest<{ Params: { ruleId: string } }>,
    reply: FastifyReply,
  ) => {
    const data = await this.service.findByRuleId(req.params.ruleId);
    return reply.send(data);
  };

  private create = async (
    req: FastifyRequest<{ Body: CreateRuleResponseDto }>,
    reply: FastifyReply,
  ) => {
    const data = await this.service.create(req.body);
    return reply.code(201).send(data);
  };

  private update = async (
    req: FastifyRequest<{
      Params: { id: string };
      Body: UpdateRuleResponseDto;
    }>,
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
}
