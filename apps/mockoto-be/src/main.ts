#!/usr/bin/env node
import Fastify from 'fastify';
import { app } from './app/app';
import open from 'open';
import fastifyStatic from '@fastify/static';
import path from 'path';
import fs from 'fs';

const host = process.env.HOST ?? 'localhost';
const port = process.env.PORT ? Number(process.env.PORT) : 3000;

// create server
const server = Fastify({
  logger: true,
});

/**
 * Resolve Angular dist path
 * 1. try inside installed package (production / npx)
 * 2. fallback to cwd (dev mode)
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

if (!staticPath) {
  console.error('❌ Angular build not found');
  console.error('👉 If developing locally: nx build mockoto-ui');
  process.exit(1);
}

// serve UI
server.register(fastifyStatic, {
  root: staticPath,
  prefix: '/',
});

// SPA fallback
server.setNotFoundHandler((req, reply) => {
  reply.sendFile('index.html');
});

// API
server.register(app, { prefix: '/api' });

// start server
async function start() {
  try {
    await server.listen({ port, host });

    const url = `http://${host}:${port}`;
    console.log(`[ ready ] ${url}`);

    await open(url);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

start();
