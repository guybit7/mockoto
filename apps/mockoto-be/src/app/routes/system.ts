import fs from 'fs';
import os from 'os';
import path from 'path';
import { FastifyInstance } from 'fastify';
import { db } from '../db';
import { StatusRepository } from '../repositories/system/status.repository';
import { ValidateRepository } from '../repositories/system/validate.repository';
import { StatusService } from '../services/system/status.service';
import { ValidateService } from '../services/system/validate.service';
import { SystemController } from '../controllers/system/system.controller';

function resolveServerPorts(): { port: number; proxyPort: number } {
  let fileCfg: Record<string, unknown> = {};
  try {
    const cfgPath = path.join(os.homedir(), '.mockoto', 'config.json');
    if (fs.existsSync(cfgPath)) {
      fileCfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
    }
  } catch { /* fall back to defaults */ }

  const port      = process.env['PORT']       ? Number(process.env['PORT'])       : ((fileCfg['port']      as number) ?? 3000);
  const proxyPort = process.env['PROXY_PORT'] ? Number(process.env['PROXY_PORT']) : ((fileCfg['proxyPort'] as number) ?? 3001);
  return { port, proxyPort };
}

export default async function systemRoutes(fastify: FastifyInstance) {
  const { port, proxyPort } = resolveServerPorts();
  const controller = new SystemController(
    new StatusService(new StatusRepository(db), port, proxyPort),
    new ValidateService(new ValidateRepository(db)),
  );
  await controller.register(fastify);
}
