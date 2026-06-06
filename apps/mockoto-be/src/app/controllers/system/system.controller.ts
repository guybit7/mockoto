import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { StatusService } from '../../services/system/status.service';
import { ValidateService } from '../../services/system/validate.service';

export class SystemController {
  constructor(
    private readonly statusService: StatusService,
    private readonly validateService: ValidateService,
  ) {}

  async register(fastify: FastifyInstance): Promise<void> {
    fastify.get('/status', this.getStatus);
    fastify.get('/validate', this.getValidate);
  }

  private getStatus = async (_req: FastifyRequest, reply: FastifyReply) => {
    return reply.send(await this.statusService.getStatus());
  };

  private getValidate = async (_req: FastifyRequest, reply: FastifyReply) => {
    return reply.send(await this.validateService.validate());
  };
}
