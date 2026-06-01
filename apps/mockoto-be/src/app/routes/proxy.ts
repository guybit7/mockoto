import { FastifyInstance, FastifyRequest } from 'fastify';
import cors from '@fastify/cors';
import { db } from '../db';
import { ProjectsRepository } from '../repositories/projects.repository';
import { CollectionsRepository } from '../repositories/collections.repository';
import { RulesRepository } from '../repositories/rules.repository';
import { RuleResponsesRepository } from '../repositories/rule-responses.repository';
import { MockResolver } from '../services/mock-resolver';
import { RequestForwarder } from '../services/request-forwarder';
import { ResponseRecorder } from '../services/response-recorder';
import { ProxyOrchestrator } from '../services/proxy.service';

export default async function proxyRoutes(fastify: FastifyInstance) {
  await fastify.register(cors, { origin: true });

  const collectionsRepo = new CollectionsRepository(db);
  const rulesRepo = new RulesRepository(db);
  const ruleResponsesRepo = new RuleResponsesRepository(db);

  const orchestrator = new ProxyOrchestrator(
    new ProjectsRepository(db),
    new MockResolver(collectionsRepo, rulesRepo, ruleResponsesRepo),
    new RequestForwarder(),
    new ResponseRecorder(rulesRepo, ruleResponsesRepo),
  );

  fastify.all(
    '/:projectId/*',
    { config: { rawBody: true } },
    async (request: FastifyRequest, reply) => {
      const params = request.params as { projectId: string; '*': string };
      const rawPath = '/' + params['*'];
      const queryStart = request.url.indexOf('?');
      const queryString = queryStart !== -1 ? request.url.slice(queryStart) : '';
      const path = rawPath + queryString;

      const method = request.method.toUpperCase();
      const hasBody = !['GET', 'HEAD', 'OPTIONS'].includes(method);
      const body =
        hasBody && request.body != null
          ? typeof request.body === 'string'
            ? request.body
            : JSON.stringify(request.body)
          : null;

      const result = await orchestrator.handle({
        projectId: params.projectId,
        path,
        method,
        incomingHeaders: request.headers as Record<string, string | string[] | undefined>,
        body,
      });

      if (result.latency > 0) {
        await new Promise((resolve) => setTimeout(resolve, result.latency));
      }

      return reply.code(result.statusCode).headers(result.headers).send(result.body ?? '');
    },
  );
}
