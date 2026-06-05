import Fastify, { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import cors from '@fastify/cors';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from '../../app/db/schema';
import { migrateDb } from '../../app/db/migrate';
import type { DB } from '../../app/db';
import { ProjectsRepository } from '../../app/repositories/projects.repository';
import { CollectionsRepository } from '../../app/repositories/collections.repository';
import { RulesRepository } from '../../app/repositories/rules.repository';
import { RuleResponsesRepository } from '../../app/repositories/rule-responses.repository';
import { ProjectsService } from '../../app/services/projects.service';
import { CollectionsService } from '../../app/services/collections.service';
import { RulesService } from '../../app/services/rules.service';
import { RuleResponsesService } from '../../app/services/rule-responses.service';
import { ProjectsController } from '../../app/controllers/projects.controller';
import { CollectionsController } from '../../app/controllers/collections.controller';
import { RulesController } from '../../app/controllers/rules.controller';
import { RuleResponsesController } from '../../app/controllers/rule-responses.controller';
import { MockResolver } from '../../app/services/mock-resolver';
import { RequestForwarder } from '../../app/services/request-forwarder';
import { ResponseRecorder } from '../../app/services/response-recorder';
import { ProxyOrchestrator } from '../../app/services/proxy.service';
import {
  NotFoundError,
  ConflictError,
  ValidationError,
  NoActiveCollectionError,
} from '../../app/errors';
import { ERROR_CODE } from '@mockoto/shared';

function domainErrorHandler(err: Error, _req: FastifyRequest, reply: FastifyReply) {
  if (err instanceof NotFoundError || err instanceof NoActiveCollectionError) {
    return reply.code(404).send(err.toResponse());
  }
  if (err instanceof ConflictError) return reply.code(409).send(err.toResponse());
  if (err instanceof ValidationError) return reply.code(400).send(err.toResponse());

  if ((err as { validation?: unknown }).validation) {
    return reply.code(400).send({
      code: ERROR_CODE.VALIDATION,
      message: err.message || 'Validation failed',
      details: (err as unknown as { validation: unknown[] }).validation,
    });
  }

  return reply.code(500).send({
    code: ERROR_CODE.INTERNAL,
    message: 'An unexpected error occurred.',
  });
}

function createInMemoryDb() {
  const sqlite = new Database(':memory:');
  sqlite.pragma('foreign_keys = ON');
  migrateDb(sqlite);
  return drizzle(sqlite, { schema });
}

function buildManagementApp(db: DB): FastifyInstance {
  const projectsRepo = new ProjectsRepository(db);
  const collectionsRepo = new CollectionsRepository(db);
  const rulesRepo = new RulesRepository(db);
  const ruleResponsesRepo = new RuleResponsesRepository(db);

  const app = Fastify({ logger: false });
  app.setErrorHandler(domainErrorHandler);

  app.register(async (api) => {
    const projectsCtrl = new ProjectsController(
      new ProjectsService(projectsRepo, collectionsRepo, rulesRepo, ruleResponsesRepo),
    );
    await projectsCtrl.register(api);

    const collectionsCtrl = new CollectionsController(
      new CollectionsService(collectionsRepo, rulesRepo, ruleResponsesRepo),
    );
    await collectionsCtrl.register(api);

    const rulesCtrl = new RulesController(new RulesService(rulesRepo));
    await rulesCtrl.register(api);

    const ruleResponsesCtrl = new RuleResponsesController(
      new RuleResponsesService(ruleResponsesRepo),
    );
    await ruleResponsesCtrl.register(api);
  }, { prefix: '/api' });

  return app;
}

function buildProxyApp(db: DB): FastifyInstance {
  const projectsRepo = new ProjectsRepository(db);
  const collectionsRepo = new CollectionsRepository(db);
  const rulesRepo = new RulesRepository(db);
  const ruleResponsesRepo = new RuleResponsesRepository(db);

  const orchestrator = new ProxyOrchestrator(
    projectsRepo,
    new MockResolver(collectionsRepo, rulesRepo, ruleResponsesRepo),
    new RequestForwarder(),
    new ResponseRecorder(rulesRepo, ruleResponsesRepo),
  );

  const app = Fastify({ logger: false });
  app.setErrorHandler(domainErrorHandler);
  app.register(cors, { origin: true });

  app.all('/:projectId/*', { config: { rawBody: true } }, async (request: FastifyRequest, reply) => {
    const params = request.params as { projectId: string; '*': string };
    const rawPath = params['*'] ? '/' + params['*'] : '/';
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
  });

  return app;
}

/** Returns a management API app backed by a fresh in-memory SQLite database. */
export function buildTestApp(): FastifyInstance {
  return buildManagementApp(createInMemoryDb());
}

/**
 * Returns both a management app and a proxy app sharing the same in-memory DB.
 * Use this for proxy-layer tests where you need to seed data via the management API
 * and then verify proxy behavior.
 */
export function buildTestAppWithProxy(): { api: FastifyInstance; proxy: FastifyInstance } {
  const db = createInMemoryDb();
  return {
    api: buildManagementApp(db),
    proxy: buildProxyApp(db),
  };
}
