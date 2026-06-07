import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { spawnSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';
import supertest from 'supertest';
import { buildTestApp } from '../../helpers/build-app';
import { FastifyInstance } from 'fastify';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const BIN = path.join(process.env['WORKSPACE_ROOT']!, 'bin', 'mockoto.js');
const NODE = process.execPath;

function cli(...args: string[]) {
  return spawnSync(NODE, [BIN, ...args], {
    encoding: 'utf8',
    timeout: 10_000,
    env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' },
  });
}

// ─── --help / --version ───────────────────────────────────────────────────────

describe('mockoto --help', () => {
  it('exits 0 and lists all commands', () => {
    const r = cli('--help');
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/open/);
    expect(r.stdout).toMatch(/status/);
    expect(r.stdout).toMatch(/doctor/);
    expect(r.stdout).toMatch(/validate/);
    expect(r.stdout).toMatch(/export/);
    expect(r.stdout).toMatch(/import/);
    expect(r.stdout).toMatch(/reset/);
    expect(r.stdout).toMatch(/config/);
    expect(r.stdout).toMatch(/logs/);
  });

  it('does NOT list removed skills commands', () => {
    const r = cli('--help');
    expect(r.stdout).not.toMatch(/skills/);
  });
});

describe('mockoto --version', () => {
  it('prints the package version', () => {
    const r = cli('--version');
    expect(r.status).toBe(0);
    expect(r.stdout.trim()).toMatch(/^\d+\.\d+\.\d+/);
  });
});

// ─── doctor ──────────────────────────────────────────────────────────────────

describe('mockoto doctor', () => {
  it('exits 0 and reports Node.js version check', () => {
    const r = cli('doctor');
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/Node\.js/);
  });

  it('reports storage writable', () => {
    const r = cli('doctor');
    expect(r.stdout).toMatch(/Storage writable/);
  });

  it('reports System healthy when environment is ok', () => {
    const r = cli('doctor');
    expect(r.stdout).toMatch(/System healthy/);
  });
});

// ─── config ──────────────────────────────────────────────────────────────────

describe('mockoto config show', () => {
  it('exits 0 and shows port, proxy port, host', () => {
    const r = cli('config', 'show');
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/Port/);
    expect(r.stdout).toMatch(/Proxy port/);
    expect(r.stdout).toMatch(/Host/);
  });
});

describe('mockoto config set', () => {
  const configFile = path.join(os.homedir(), '.mockoto', 'config.json');
  let originalConfig: string | null = null;

  beforeEach(() => {
    originalConfig = fs.existsSync(configFile) ? fs.readFileSync(configFile, 'utf8') : null;
  });

  afterEach(() => {
    if (originalConfig !== null) {
      fs.writeFileSync(configFile, originalConfig, 'utf8');
    } else if (fs.existsSync(configFile)) {
      fs.unlinkSync(configFile);
    }
  });

  it('sets port and exits 0', () => {
    const r = cli('config', 'set', 'port', '4321');
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/port set to 4321/i);
    const cfg = JSON.parse(fs.readFileSync(configFile, 'utf8'));
    expect(cfg.port).toBe(4321);
  });

  it('sets proxyPort and exits 0', () => {
    const r = cli('config', 'set', 'proxyPort', '4322');
    expect(r.status).toBe(0);
    const cfg = JSON.parse(fs.readFileSync(configFile, 'utf8'));
    expect(cfg.proxyPort).toBe(4322);
  });

  it('sets host and exits 0', () => {
    const r = cli('config', 'set', 'host', '0.0.0.0');
    expect(r.status).toBe(0);
    const cfg = JSON.parse(fs.readFileSync(configFile, 'utf8'));
    expect(cfg.host).toBe('0.0.0.0');
  });

  it('rejects an unknown key with exit 1', () => {
    const r = cli('config', 'set', 'notAKey', 'value');
    expect(r.status).toBe(1);
    expect(r.stdout).toMatch(/Unknown config key/);
  });

  it('rejects an out-of-range port with exit 1', () => {
    const r = cli('config', 'set', 'port', '99999');
    expect(r.status).toBe(1);
    expect(r.stderr + r.stdout).toMatch(/Invalid port/);
  });

  it('rejects a non-numeric port with exit 1', () => {
    const r = cli('config', 'set', 'port', 'abc');
    expect(r.status).toBe(1);
    expect(r.stderr + r.stdout).toMatch(/Invalid port/);
  });
});

// ─── Helpers for "no server" tests ───────────────────────────────────────────

// Runs CLI with a fake HOME pointing to a config that uses an unused port,
// guaranteeing no server will be reachable regardless of what else is running.
function cliNoServer(...args: string[]) {
  const fakeHome = fs.mkdtempSync(path.join(os.tmpdir(), 'mockoto-home-'));
  fs.mkdirSync(path.join(fakeHome, '.mockoto'), { recursive: true });
  fs.writeFileSync(
    path.join(fakeHome, '.mockoto', 'config.json'),
    JSON.stringify({ port: 19999, proxyPort: 19998, host: '127.0.0.1' }),
  );
  try {
    return spawnSync(NODE, [BIN, ...args], {
      encoding: 'utf8',
      timeout: 10_000,
      env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0', HOME: fakeHome, USERPROFILE: fakeHome },
    });
  } finally {
    fs.rmSync(fakeHome, { recursive: true, force: true });
  }
}

// ─── status (no server) ───────────────────────────────────────────────────────

describe('mockoto status (no server)', () => {
  it('exits 1 and says Mockoto is not running', () => {
    const r = cliNoServer('status');
    expect(r.status).toBe(1);
    expect(r.stdout + r.stderr).toMatch(/not running/i);
  });
});

// ─── validate (no server) ────────────────────────────────────────────────────

describe('mockoto validate (no server)', () => {
  it('exits 1 and prompts to start Mockoto', () => {
    const r = cliNoServer('validate');
    expect(r.status).toBe(1);
    expect(r.stdout + r.stderr).toMatch(/Could not connect/i);
  });
});

// ─── export (no db) ──────────────────────────────────────────────────────────

describe('mockoto export (no database)', () => {
  it('exits 1 when no database exists', () => {
    // Run from a temp dir so there is no data/mockoto.db
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mockoto-test-'));
    const r = spawnSync(NODE, [BIN, 'export'], {
      encoding: 'utf8',
      timeout: 10_000,
      cwd: tmpDir,
      env: { ...process.env, NO_COLOR: '1' },
    });
    fs.rmSync(tmpDir, { recursive: true, force: true });
    expect(r.status).toBe(1);
    expect(r.stderr + r.stdout).toMatch(/No database found/i);
  });
});

// ─── import (missing file) ───────────────────────────────────────────────────

describe('mockoto import (missing file)', () => {
  it('exits 1 when the backup file does not exist', () => {
    const r = cli('import', 'nonexistent-backup.zip');
    expect(r.status).toBe(1);
    expect(r.stderr + r.stdout).toMatch(/File not found/i);
  });
});

// ─── import (invalid zip) ────────────────────────────────────────────────────

describe('mockoto import (invalid zip)', () => {
  it('exits 1 when zip is missing a manifest', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mockoto-test-'));
    const badZip = path.join(tmpDir, 'bad.zip');
    const AdmZip = require('adm-zip');
    const zip = new AdmZip();
    zip.addFile('other.txt', Buffer.from('not a mockoto backup'));
    zip.writeZip(badZip);

    const r = cli('import', badZip);
    fs.rmSync(tmpDir, { recursive: true, force: true });
    expect(r.status).toBe(1);
    expect(r.stderr + r.stdout).toMatch(/missing manifest/i);
  });
});

// ─── reset (no db) ───────────────────────────────────────────────────────────

describe('mockoto reset (no database)', () => {
  it('exits 0 with nothing-to-reset message when no db exists', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mockoto-test-'));
    const r = spawnSync(NODE, [BIN, 'reset'], {
      encoding: 'utf8',
      timeout: 10_000,
      cwd: tmpDir,
      env: { ...process.env, NO_COLOR: '1' },
    });
    fs.rmSync(tmpDir, { recursive: true, force: true });
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/Nothing to reset/i);
  });
});

// ─── logs (no log file) ──────────────────────────────────────────────────────

describe('mockoto logs (no log file)', () => {
  it('exits 0 and explains where logs will be written', () => {
    // Override home so there is no existing log
    const fakeHome = fs.mkdtempSync(path.join(os.tmpdir(), 'mockoto-home-'));
    const r = spawnSync(NODE, [BIN, 'logs'], {
      encoding: 'utf8',
      timeout: 10_000,
      env: { ...process.env, NO_COLOR: '1', HOME: fakeHome, USERPROFILE: fakeHome },
    });
    fs.rmSync(fakeHome, { recursive: true, force: true });
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/No log file found/i);
  });
});

// ─── status + validate (with live test server) ────────────────────────────────

describe('mockoto status + validate (live server)', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = buildTestApp();
    await app.listen({ port: 0, host: '127.0.0.1' });
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/status returns running status with counts', async () => {
    const res = await supertest(app.server).get('/api/status');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('running');
    expect(typeof res.body.projects).toBe('number');
    expect(typeof res.body.collections).toBe('number');
    expect(typeof res.body.rules).toBe('number');
    expect(typeof res.body.responses).toBe('number');
    expect(typeof res.body.uptime).toBe('number');
    expect(res.body.database).toBe('ok');
  });

  it('GET /api/validate returns no issues on an empty database', async () => {
    const res = await supertest(app.server).get('/api/validate');
    expect(res.status).toBe(200);
    expect(res.body.issues).toEqual([]);
    expect(res.body.counts.projects).toBe(0);
  });

  it('GET /api/validate detects a rule with no responses', async () => {
    // Seed: project → collection → rule (no responses)
    const projRes = await supertest(app.server)
      .post('/api/projects')
      .send({ name: 'Validate Test', baseUrl: 'https://validate.test', ownerName: 'test-team' });
    expect(projRes.status).toBe(201);
    const projectId = projRes.body.id;

    const colRes = await supertest(app.server)
      .post('/api/collections')
      .send({ projectId, name: 'Col' });
    expect(colRes.status).toBe(201);
    const collectionId = colRes.body.id;

    const ruleRes = await supertest(app.server)
      .post('/api/rules')
      .send({ projectId, collectionId, url: '/test', requestMethod: 'GET' });
    expect(ruleRes.status).toBe(201);

    const validateRes = await supertest(app.server).get('/api/validate');
    expect(validateRes.status).toBe(200);
    expect(validateRes.body.issues.length).toBeGreaterThan(0);
    expect(validateRes.body.issues[0]).toMatch(/no responses/i);
  });
});
