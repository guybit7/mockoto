import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  CreateProjectDto,
  UpdateProjectDto,
  CreateProjectSchema,
  UpdateProjectSchema,
} from '@mockoto/shared';
import { ProjectsService } from '../services/projects.service';
import { BaseController } from './base.controller';
import { validateBody } from '../hooks/validation.hook';

export class ProjectsController extends BaseController {
  protected readonly prefix = '/projects';

  constructor(private readonly service: ProjectsService) {
    super();
  }

  protected async routes(fastify: FastifyInstance): Promise<void> {
    fastify.get('/', this.list);

    fastify.get<{ Params: { id: string } }>('/:id', this.getById);

    fastify.post<{ Body: CreateProjectDto }>('/', {
      preValidation: [validateBody(CreateProjectSchema)],
      handler: this.create,
    });

    fastify.put<{ Params: { id: string }; Body: UpdateProjectDto }>('/:id', {
      preValidation: [validateBody(UpdateProjectSchema)],
      handler: this.update,
    });

    fastify.delete<{ Params: { id: string } }>('/:id', this.remove);
  }

  private list = async (_req: FastifyRequest, reply: FastifyReply) => {
    const projects = await this.service.findAll();
    return reply.send(projects);
  };

  private getById = async (
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) => {
    const project = await this.service.findById(req.params.id);
    return reply.send(project);
  };

  private create = async (
    req: FastifyRequest<{ Body: CreateProjectDto }>,
    reply: FastifyReply,
  ) => {
    const project = await this.service.create(req.body);
    return reply.code(201).send(project);
  };

  private update = async (
    req: FastifyRequest<{ Params: { id: string }; Body: UpdateProjectDto }>,
    reply: FastifyReply,
  ) => {
    const project = await this.service.update(req.params.id, req.body);
    return reply.send(project);
  };

  private remove = async (
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) => {
    await this.service.delete(req.params.id);
    return reply.code(204).send();
  };
}
