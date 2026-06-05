import { FastifyInstance } from 'fastify';
import { db } from '../db';
import { ProjectsRepository } from '../repositories/projects.repository';
import { CollectionsRepository } from '../repositories/collections.repository';
import { RulesRepository } from '../repositories/rules.repository';
import { RuleResponsesRepository } from '../repositories/rule-responses.repository';
import { ProjectsService } from '../services/projects.service';
import { ProjectsController } from '../controllers/projects.controller';

export default async function projectRoutes(fastify: FastifyInstance) {
  const service = new ProjectsService(
    new ProjectsRepository(db),
    new CollectionsRepository(db),
    new RulesRepository(db),
    new RuleResponsesRepository(db),
  );
  const controller = new ProjectsController(service);
  await controller.register(fastify);
}
