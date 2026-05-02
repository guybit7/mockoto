import { FastifyInstance } from 'fastify';
import { db } from '../db';

import { CollectionsRepository } from '../repositories/collections.repository';
import { CollectionsService } from '../services/collections.service';
import { CollectionsController } from '../controllers/collections.controller';

export default async function collectionsRoutes(fastify: FastifyInstance) {
  const repository = new CollectionsRepository(db);
  const service = new CollectionsService(repository);
  const controller = new CollectionsController(service);

  await controller.register(fastify);
}
