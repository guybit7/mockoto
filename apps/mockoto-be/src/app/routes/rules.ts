import { FastifyInstance } from 'fastify';
import { db } from '../db';

import { RulesRepository } from '../repositories/rules.repository';
import { RulesService } from '../services/rules.service';
import { RulesController } from '../controllers/rules.controller';

export default async function rulesRoutes(fastify: FastifyInstance) {
  const repository = new RulesRepository(db);
  const service = new RulesService(repository);
  const controller = new RulesController(service);

  await controller.register(fastify);
}
