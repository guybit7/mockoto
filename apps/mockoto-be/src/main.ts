#!/usr/bin/env node
import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import open from 'open';
import path from 'path';
import fs from 'fs';

import projectsRoutes from './app/routes/projects';
import { runMigrations } from './app/db/migrate';

const host = process.env.HOST ?? 'localhost';
const port = process.env.PORT ? Number(process.env.PORT) : 3000;

// 🔹 detect environment
const nodeEnv = process.env.NODE_ENV ?? 'production';

const isProd = nodeEnv === 'production';

console.log(new Date().toISOString());
console.log(isProd);
// create server
const server = Fastify({
  logger: true,
});

/**
 * Resolve Angular dist path
 */
function resolveUiPath() {
  const root = path.resolve(__dirname);

  const candidates = [
    path.resolve(root, '../../../../mockoto-ui/browser'),
    path.resolve(root, '../../../../../mockoto-ui/browser'),
    path.resolve(process.cwd(), 'dist/apps/mockoto-ui/browser'),
  ];

  for (const p of candidates) {
    if (fs.existsSync(path.join(p, 'index.html'))) {
      return p;
    }
  }

  return null;
}

// resolve UI
const staticPath = resolveUiPath();

// 🔥 serve UI only in production
if (isProd && staticPath) {
  server.register(fastifyStatic, {
    root: staticPath,
    prefix: '/',
  });

  // SPA fallback
  server.setNotFoundHandler((req, reply) => {
    reply.sendFile('index.html');
  });

  console.log('🟢 UI enabled (production mode)');
} else {
  console.log('🟡 API-only mode (no UI)');
}

// 🔹 API only
server.register(projectsRoutes, { prefix: '/api' });

// start server
async function start() {
  try {
    runMigrations();
    await server.listen({ port, host });

    const url = `http://${host}:${port}`;
    console.log(`[ ready ] ${url}`);

    // open browser only if UI is enabled
    if (isProd) {
      await open(url);
    }
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

start();
