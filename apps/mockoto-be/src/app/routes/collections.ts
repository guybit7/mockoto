import { FastifyInstance } from 'fastify';
import { db } from '../db';

import { CollectionsRepository } from '../repositories/collections.repository';
import { RulesRepository } from '../repositories/rules.repository';
import { RuleResponsesRepository } from '../repositories/rule-responses.repository';
import { CollectionsService } from '../services/collections.service';
import { CollectionsController } from '../controllers/collections.controller';

export default async function collectionsRoutes(fastify: FastifyInstance) {
  const service = new CollectionsService(
    new CollectionsRepository(db),
    new RulesRepository(db),
    new RuleResponsesRepository(db),
  );
  const controller = new CollectionsController(service);

  await controller.register(fastify);
}
