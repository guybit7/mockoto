import { FastifyInstance } from 'fastify';
import { db } from '../db';

import { RuleResponsesRepository } from '../repositories/rule-responses.repository';
import { RuleResponsesService } from '../services/rule-responses.service';
import { RuleResponsesController } from '../controllers/rule-responses.controller';

export default async function ruleResponsesRoutes(fastify: FastifyInstance) {
  const repository = new RuleResponsesRepository(db);
  const service = new RuleResponsesService(repository);
  const controller = new RuleResponsesController(service);

  await controller.register(fastify);
}
