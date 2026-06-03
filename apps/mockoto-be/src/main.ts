#!/usr/bin/env node
import Fastify, { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fastifyStatic from '@fastify/static';
import open from 'open';
import path from 'path';
import fs from 'fs';

import { runMigrations } from './app/db/migrate';
import { registerRoutes } from './app/routes';
import proxyRoutes from './app/routes/proxy';
import { resolveSkillsRoot } from './app/utils/skills-path';
import { ERROR_CODE } from '@mockoto/shared';
import { ConflictError, NotFoundError, NoActiveCollectionError, ValidationError } from './app/errors';

const host = process.env.HOST ?? 'localhost';
const port = process.env.PORT ? Number(process.env.PORT) : 3000;
const proxyPort = process.env.PROXY_PORT ? Number(process.env.PROXY_PORT) : 3001;

const isProd = (process.env.NODE_ENV ?? 'production') === 'production';

function resolveUiPath() {
  const root = path.resolve(__dirname);
  const candidates = [
    path.resolve(root, '../mockoto-ui/browser'),
    path.resolve(process.cwd(), 'dist/apps/mockoto-ui/browser'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(path.join(p, 'index.html'))) return p;
  }
  return null;
}

function makeDomainErrorHandler(log: FastifyInstance['log']) {
  return (err: Error, _req: FastifyRequest, reply: FastifyReply) => {
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

    log.error(err);
    return reply.code(500).send({
      code: ERROR_CODE.INTERNAL,
      message: 'An unexpected error occurred. Please try again later.',
    });
  };
}

async function start() {
  const server = Fastify({ logger: true });
  server.setErrorHandler(makeDomainErrorHandler(server.log));

  const staticPath = resolveUiPath();
  if (isProd && staticPath) {
    server.register(fastifyStatic, { root: staticPath, prefix: '/' });
    server.setNotFoundHandler((_req, reply) => reply.sendFile('index.html'));
    server.log.info('UI enabled (production mode)');
  } else {
    server.log.info('API-only mode (no UI)');
  }

  try {
    runMigrations();

    await registerRoutes(server);
    await server.listen({ port, host });
    const url = `http://${host}:${port}`;
    server.log.info(`management server: ${url}`);

    const skillsRoot = resolveSkillsRoot();
    if (skillsRoot) {
      server.log.info(`agent skills: ${skillsRoot}`);
      server.log.info(`agent skills API: ${url}/api/skills`);
    } else {
      server.log.info('agent skills: not found');
    }

    if (isProd) await open(url);

    const proxyServer = Fastify({ logger: true });
    proxyServer.setErrorHandler(makeDomainErrorHandler(proxyServer.log));
    await proxyServer.register(proxyRoutes);
    await proxyServer.listen({ port: proxyPort, host });
    server.log.info(`proxy server: http://${host}:${proxyPort}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

start();
