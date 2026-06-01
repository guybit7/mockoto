import { FastifyInstance } from 'fastify';

import projectsRoutes from './projects';
import collectionsRoutes from './collections';
import rulesRoutes from './rules';
import ruleResponsesRoutes from './rule-responses';
import skillsRoutes from './skills';

const apiRoutes = [
  projectsRoutes,
  collectionsRoutes,
  rulesRoutes,
  ruleResponsesRoutes,
  skillsRoutes,
];

export async function registerRoutes(server: FastifyInstance) {
  for (const route of apiRoutes) {
    await server.register(route, { prefix: '/api' });
  }
}
