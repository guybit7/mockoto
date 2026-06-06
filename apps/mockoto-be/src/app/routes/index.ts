import { FastifyInstance } from 'fastify';

import projectsRoutes from './projects';
import collectionsRoutes from './collections';
import rulesRoutes from './rules';
import ruleResponsesRoutes from './rule-responses';
import skillsRoutes from './skills';
import systemRoutes from './system';

const apiRoutes = [
  projectsRoutes,
  collectionsRoutes,
  rulesRoutes,
  ruleResponsesRoutes,
  skillsRoutes,
  systemRoutes,
];

export async function registerRoutes(server: FastifyInstance) {
  for (const route of apiRoutes) {
    await server.register(route, { prefix: '/api' });
  }
}
