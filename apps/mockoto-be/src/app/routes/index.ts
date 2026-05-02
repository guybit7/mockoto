import { FastifyInstance } from 'fastify';

import projectsRoutes from './projects';
import collectionsRoutes from './collections';
import rulesRoutes from './rules';
import ruleResponsesRoutes from './rule-responses';

const routes = [
  projectsRoutes,
  collectionsRoutes,
  rulesRoutes,
  ruleResponsesRoutes,
];

export async function registerRoutes(server: FastifyInstance) {
  for (const route of routes) {
    await server.register(route, { prefix: '/api' });
  }
}
