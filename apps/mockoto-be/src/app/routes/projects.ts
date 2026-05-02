import { FastifyInstance } from 'fastify';
import { db } from '../db';
import { ProjectsRepository } from '../repositories/projects.repository';
import { ProjectsService } from '../services/projects.service';
import { ProjectsController } from '../controllers/projects.controller';

export default async function projectRoutes(fastify: FastifyInstance) {
  const repository = new ProjectsRepository(db);
  const service = new ProjectsService(repository);
  const controller = new ProjectsController(service);
  await controller.register(fastify);
}
