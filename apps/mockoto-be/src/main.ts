#!/usr/bin/env node
import Fastify, { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fastifyStatic from '@fastify/static';
import open from 'open';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { PassThrough } from 'stream';

import { runMigrations } from './app/db/migrate';
import { registerRoutes } from './app/routes';
import proxyRoutes from './app/routes/proxy';
import { ERROR_CODE } from '@mockoto/shared';
import { ConflictError, NotFoundError, NoActiveCollectionError, ValidationError } from './app/errors';

function loadFileConfig(): { port?: number; proxyPort?: number; host?: string } {
  try {
    const cfgPath = path.join(os.homedir(), '.mockoto', 'config.json');
    if (fs.existsSync(cfgPath)) {
      return JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
    }
  } catch {
    // ignore — fall back to defaults
  }
  return {};
}

const fileCfg = loadFileConfig();
const host = process.env.HOST ?? fileCfg.host ?? 'localhost';
const port      = toPort(process.env.PORT,       fileCfg.port,      3000);
const proxyPort = toPort(process.env.PROXY_PORT, fileCfg.proxyPort, 3001);

function toPort(envVal: string | undefined, fileCfgVal: number | undefined, def: number): number {
  const fromEnv = envVal ? Number(envVal) : NaN;
  if (Number.isFinite(fromEnv) && fromEnv > 0) return fromEnv;
  return fileCfgVal ?? def;
}

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

function openLogFile(): fs.WriteStream | null {
  try {
    const logDir = path.join(os.homedir(), '.mockoto');
    fs.mkdirSync(logDir, { recursive: true });
    const fileStream = fs.createWriteStream(path.join(logDir, 'mockoto.log'), { flags: 'a' });
    fileStream.on('error', () => { /* log file errors must not crash the server */ });
    return fileStream;
  } catch {
    return null;
  }
}

// Suppress EPIPE errors on stdout — happens when stdout is piped to a process that
// closes early (e.g. `mockoto 2>&1 | head`). Without this, Node.js throws an
// uncaught 'error' event and crashes the server.
process.stdout.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code !== 'EPIPE') throw err;
});

function makeLogStream(fileStream: fs.WriteStream | null): NodeJS.WritableStream {
  const tee = new PassThrough();
  tee.on('error', () => { /* stream errors must not crash the server */ });
  tee.pipe(process.stdout);
  if (fileStream) tee.pipe(fileStream, { end: false });
  return tee;
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
  const logFile = openLogFile();
  const server = Fastify({ logger: { stream: makeLogStream(logFile) } });
  server.setErrorHandler(makeDomainErrorHandler(server.log));

  const staticPath = resolveUiPath();
  if (isProd && staticPath) {
    server.register(fastifyStatic, { root: staticPath, prefix: '/' });
    server.setNotFoundHandler((_req, reply) => reply.sendFile('index.html'));
  }

  try {
    runMigrations();

    await registerRoutes(server);
    await server.listen({ port, host });

    const url = `http://${host}:${port}`;
    server.log.info(`Mockoto running at ${url}`);

    if (isProd) await open(url);

    const proxyServer = Fastify({ logger: { stream: makeLogStream(logFile) } });
    proxyServer.setErrorHandler(makeDomainErrorHandler(proxyServer.log));
    await proxyServer.register(proxyRoutes);
    await proxyServer.listen({ port: proxyPort, host });
    server.log.info(`Proxy server running at http://${host}:${proxyPort}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

start();
