#!/usr/bin/env node
'use strict';

const path = require('path');
const fs = require('fs');
const os = require('os');
const http = require('http');
const https = require('https');
const { spawnSync } = require('child_process');
const readline = require('readline');

// ─── Config ──────────────────────────────────────────────────────────────────

const CONFIG_DIR = path.join(os.homedir(), '.mockoto');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');
const LOG_FILE = path.join(CONFIG_DIR, 'mockoto.log');
const PID_FILE = path.join(CONFIG_DIR, 'mockoto.pid');

const DEFAULT_CONFIG = { port: 3000, proxyPort: 3001, host: 'localhost', dataDir: path.join(os.homedir(), '.mockoto', 'data') };

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      return { ...DEFAULT_CONFIG, ...JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')) };
    }
  } catch {
    // fall through to defaults
  }
  return { ...DEFAULT_CONFIG };
}

// ─── HTTP helper ─────────────────────────────────────────────────────────────

function apiGet(urlStr, timeoutMs = 4000) {
  return new Promise((resolve, reject) => {
    let url;
    try { url = new URL(urlStr); } catch (e) { return reject(e); }
    const lib = url.protocol === 'https:' ? https : http;
    // Use a manual timer for a true wall-clock deadline (the http timeout option
    // is an idle/socket timeout and won't fire if the server accepts the connection
    // but never writes a response byte).
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      req.destroy();
      reject(new Error('Connection timed out'));
    }, timeoutMs);
    const req = lib.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        try { resolve(JSON.parse(data)); } catch { resolve(data); }
      });
    });
    req.on('error', (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(err);
    });
  });
}

// ─── Output helpers ──────────────────────────────────────────────────────────

const C = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
};

const noColour = !process.stdout.isTTY || !!process.env['NO_COLOR'] || process.env['FORCE_COLOR'] === '0';
const colour = (c, text) => noColour ? text : `${c}${text}${C.reset}`;

const OK    = colour(C.green,  '✓');
const FAIL  = colour(C.red,    '✗');
const WARN  = colour(C.yellow, '⚠');
const HR    = colour(C.dim, '─'.repeat(40));

function success(msg)  { console.log(`${OK}  ${msg}`); }
function fail(msg)     { console.log(`${FAIL}  ${msg}`); }
function warn(msg)     { console.log(`${WARN}  ${msg}`); }
function detail(label, value) {
  const pad = label.padEnd(14);
  console.log(`   ${colour(C.dim, pad)} ${value}`);
}
function blank()       { console.log(''); }
function hr()          { console.log(HR); }
function header(msg)   { console.log(`\n${colour(C.bold, msg)}`); }

function fatal(msg) {
  console.error(`${FAIL}  ${msg}`);
  process.exit(1);
}

// ─── Confirm helper ──────────────────────────────────────────────────────────

function confirm(prompt, expected) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === expected.toLowerCase());
    });
  });
}

function formatUptime(seconds) {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}

// ─── Commands ─────────────────────────────────────────────────────────────────

async function cmdStart({ detach } = {}) {
  const mainPath = path.resolve(__dirname, '../dist/apps/mockoto-be/main.js');
  if (!fs.existsSync(mainPath)) {
    fatal('Server binary not found — try reinstalling: npm install -g @guybit7/mockoto-cli');
    return;
  }

  if (detach) {
    const { spawn } = require('child_process');
    const out = fs.openSync(LOG_FILE, 'a');
    const child = spawn(process.execPath, [mainPath], {
      detached: true,
      stdio: ['ignore', out, out],
    });
    child.unref();
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
    fs.writeFileSync(PID_FILE, String(child.pid));
    success(`Mockoto started in background (PID ${child.pid})`);
    const cfg = loadConfig();
    detail('URL', `http://${cfg.host}:${cfg.port}`);
    return;
  }

  try {
    require(mainPath);
  } catch (err) {
    if (err.code === 'MODULE_NOT_FOUND') {
      fatal(
        `A required native dependency is missing.\n` +
        `  This is usually better-sqlite3 failing to install on your platform.\n` +
        `  Try: npm install -g @guybit7/mockoto-cli --build-from-source\n` +
        `  Or ensure you have Python and a C++ compiler installed (Windows: npm install -g windows-build-tools)`
      );
      return;
    }
    throw err;
  }
}

async function cmdStop() {
  if (!fs.existsSync(PID_FILE)) {
    fail('No running Mockoto instance found (no PID file)');
    console.log(`   Start with: ${colour(C.bold, 'mockoto --detach')}`);
    process.exit(1);
  }

  const pid = parseInt(fs.readFileSync(PID_FILE, 'utf8').trim(), 10);
  if (!Number.isInteger(pid) || pid <= 0) {
    fail('PID file is corrupted');
    fs.unlinkSync(PID_FILE);
    process.exit(1);
  }

  try {
    process.kill(pid, 'SIGTERM');
    fs.unlinkSync(PID_FILE);
    success(`Mockoto stopped (PID ${pid})`);
  } catch (err) {
    if (err.code === 'ESRCH') {
      // Process already dead
      fs.unlinkSync(PID_FILE);
      fail(`Process ${pid} was not running — cleaned up PID file`);
      process.exit(1);
    }
    throw err;
  }
}

async function cmdOpen() {
  const cfg = loadConfig();
  const url = `http://${cfg.host}:${cfg.port}`;
  try {
    await apiGet(`${url}/api/status`);
  } catch {
    fail('Mockoto is not running');
    console.log(`   Start it with: ${colour(C.bold, 'mockoto')}`);
    process.exit(1);
  }
  const { default: open } = await import('open');
  await open(url);
  success(`Opened ${url}`);
}

async function cmdStatus() {
  const cfg = loadConfig();
  const url = `http://${cfg.host}:${cfg.port}/api/status`;

  let data;
  try {
    data = await apiGet(url);
  } catch {
    blank();
    fail('Mockoto is not running');
    console.log(`   Start it with: ${colour(C.bold, 'mockoto')}`);
    blank();
    process.exit(1);
  }

  blank();
  header('Status');
  hr();
  success('Running');
  detail('Port', data.port ?? cfg.port);
  detail('Proxy port', data.proxyPort ?? cfg.proxyPort);
  detail('Uptime', formatUptime(data.uptime ?? 0));
  detail('Database', data.database ?? 'unknown');
  blank();
  header('Data');
  hr();
  detail('Projects', data.projects ?? 0);
  detail('Collections', data.collections ?? 0);
  detail('Rules', data.rules ?? 0);
  detail('Responses', data.responses ?? 0);
  blank();
}

async function cmdDoctor() {
  const cfg = loadConfig();
  let allOk = true;

  blank();
  header('Doctor');
  hr();

  // Node.js version
  const nodeVer = process.versions.node;
  const [major] = nodeVer.split('.').map(Number);
  if (major >= 18) {
    success(`Node.js ${nodeVer}`);
  } else {
    fail(`Node.js ${nodeVer} — requires 18 or later`);
    allOk = false;
  }

  // Data directory
  const dataDir = path.resolve(process.cwd(), 'data');
  try {
    fs.mkdirSync(dataDir, { recursive: true });
    const testFile = path.join(dataDir, '.mockoto-write-test');
    fs.writeFileSync(testFile, '');
    fs.unlinkSync(testFile);
    success('Storage writable');
  } catch {
    fail('Storage is not writable');
    allOk = false;
  }

  // Database
  const dbPath = path.join(dataDir, 'mockoto.db');
  if (fs.existsSync(dbPath)) {
    success('Database initialized');
  } else {
    warn('Database not yet created — will be created on first start');
  }

  // Config file (optional)
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
      success('Configuration valid');
    } catch {
      fail('Configuration has invalid JSON — run "mockoto config edit" to fix');
      allOk = false;
    }
  } else {
    success('Configuration valid (defaults)');
  }

  // Server connectivity (optional check)
  try {
    await apiGet(`http://${cfg.host}:${cfg.port}/api/status`, 2000);
    success(`Server reachable at http://${cfg.host}:${cfg.port}`);
  } catch {
    warn(`Server not running — start with: mockoto`);
  }

  blank();
  hr();
  if (allOk) {
    success('System healthy');
  } else {
    fail('Issues detected — see above');
    blank();
    process.exit(1);
  }
  blank();
}

async function cmdValidate() {
  const cfg = loadConfig();
  const url = `http://${cfg.host}:${cfg.port}/api/validate`;

  let data;
  try {
    data = await apiGet(url);
  } catch {
    blank();
    fail('Could not connect to Mockoto');
    console.log(`   Start it first with: ${colour(C.bold, 'mockoto')}`);
    blank();
    process.exit(1);
  }

  blank();
  header('Validate');
  hr();

  if (data.issues && data.issues.length > 0) {
    fail(`Found ${data.issues.length} issue(s):`);
    for (const issue of data.issues) {
      console.log(`   ${colour(C.yellow, '•')} ${issue}`);
    }
    blank();
    process.exit(1);
  }

  success(`Projects (${data.counts?.projects ?? 0})`);
  success(`Collections (${data.counts?.collections ?? 0})`);
  success(`Rules (${data.counts?.rules ?? 0})`);
  success(`Responses (${data.counts?.responses ?? 0})`);
  blank();
  hr();
  success('Data integrity verified');
  blank();
}

async function cmdExport(outputArg) {
  const dataDir = path.resolve(process.cwd(), 'data');
  const dbPath = path.join(dataDir, 'mockoto.db');

  if (!fs.existsSync(dbPath)) {
    fatal('No database found. Start Mockoto at least once before exporting.');
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const outFile = outputArg
    ? path.resolve(process.cwd(), outputArg)
    : path.resolve(process.cwd(), `mockoto-backup-${timestamp}.zip`);

  blank();
  console.log(`   Creating backup…`);

  let backupPath = null;
  try {
    const AdmZip = require('adm-zip');
    const Database = require('better-sqlite3');

    // Use better-sqlite3 backup API for a safe, consistent copy
    backupPath = path.join(os.tmpdir(), `mockoto-backup-${timestamp}.db`);
    const db = new Database(dbPath, { readonly: true });
    await db.backup(backupPath);
    db.close();

    const zip = new AdmZip();
    zip.addLocalFile(backupPath, '', 'mockoto.db');

    const manifest = {
      version: 1,
      createdAt: new Date().toISOString(),
      source: 'mockoto-export',
    };
    zip.addFile('manifest.json', Buffer.from(JSON.stringify(manifest, null, 2)));

    if (fs.existsSync(CONFIG_FILE)) {
      zip.addLocalFile(CONFIG_FILE, '', 'config.json');
    }

    zip.writeZip(outFile);

    blank();
    success('Backup created successfully');
    blank();
    console.log(`   Location:`);
    console.log(`   ${colour(C.bold, outFile)}`);
    blank();
  } catch (err) {
    // Clean up temp file before process.exit (finally does not run after process.exit)
    if (backupPath) { try { fs.unlinkSync(backupPath); } catch { /* already gone */ } }
    fatal(`Export failed: ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    // Runs on the success path to clean up the temp db after the zip is written
    if (backupPath) { try { fs.unlinkSync(backupPath); } catch { /* already gone */ } }
  }
}

async function cmdImport(backupArg) {
  const backupPath = path.resolve(process.cwd(), backupArg);

  if (!fs.existsSync(backupPath)) {
    fatal(`File not found: ${backupPath}`);
  }

  const dataDir = path.resolve(process.cwd(), 'data');
  const dbPath = path.join(dataDir, 'mockoto.db');

  let zip;
  try {
    const AdmZip = require('adm-zip');
    zip = new AdmZip(backupPath);
  } catch (err) {
    fatal(`Could not read backup file: ${err.message}`);
    return; // unreachable — satisfies flow analysis if process.exit is stubbed
  }

  if (!zip.getEntry('manifest.json')) {
    fatal('Invalid backup file: missing manifest. Was this created by "mockoto export"?');
  }
  if (!zip.getEntry('mockoto.db')) {
    fatal('Invalid backup file: missing database.');
  }

  blank();
  if (fs.existsSync(dbPath)) {
    console.log(`   ${colour(C.yellow, '⚠  This will replace your current data.')}`);
    console.log('   Your existing database will be backed up automatically.');
    blank();
    const confirmed = await confirm('   Type "import" to continue: ', 'import');
    if (!confirmed) {
      blank();
      console.log('   Import cancelled.');
      blank();
      process.exit(0);
    }

    // Safe rollback point
    const rollback = `${dbPath}.pre-import-${Date.now()}`;
    fs.copyFileSync(dbPath, rollback);
    warn(`Previous database saved to: ${path.basename(rollback)}`);
  }

  let rollbackPath = null;
  try {
    // Record rollback path so we can surface it on failure
    rollbackPath = fs.readdirSync(dataDir)
      .filter(f => f.startsWith('mockoto.db.pre-import-'))
      .sort().at(-1);
    rollbackPath = rollbackPath ? path.join(dataDir, rollbackPath) : null;

    fs.mkdirSync(dataDir, { recursive: true });
    zip.extractEntryTo(zip.getEntry('mockoto.db'), dataDir, false, true, false, 'mockoto.db');
    blank();
    success('Backup restored successfully');
    console.log(`   Restart Mockoto for changes to take effect.`);
    blank();
  } catch (err) {
    blank();
    fail(`Restore failed: ${err.message}`);
    if (rollbackPath && fs.existsSync(rollbackPath)) {
      console.log(`   Your previous database was preserved at:`);
      console.log(`   ${colour(C.bold, rollbackPath)}`);
      console.log(`   To recover: copy that file to ${colour(C.dim, dbPath)}`);
    }
    blank();
    process.exit(1);
  }
}

async function cmdReset() {
  const dataDir = path.resolve(process.cwd(), 'data');
  const dbPath = path.join(dataDir, 'mockoto.db');

  if (!fs.existsSync(dbPath)) {
    blank();
    console.log('   Nothing to reset — no database found.');
    blank();
    process.exit(0);
  }

  blank();
  console.log(`   ${colour(C.red, colour(C.bold, '⚠  Warning: This is permanent and cannot be undone.'))}`);
  console.log('   All projects, collections, rules, and responses will be deleted.');
  blank();
  const confirmed = await confirm('   Type "reset" to confirm: ', 'reset');
  if (!confirmed) {
    blank();
    console.log('   Reset cancelled.');
    blank();
    process.exit(0);
  }

  try {
    for (const ext of ['', '-wal', '-shm']) {
      const f = dbPath + ext;
      if (fs.existsSync(f)) fs.unlinkSync(f);
    }
    blank();
    success('Local environment reset');
    console.log(`   Run ${colour(C.bold, 'mockoto')} to start fresh.`);
    blank();
  } catch (err) {
    fatal(`Reset failed: ${err.message}`);
  }
}

async function cmdConfigShow() {
  const cfg = loadConfig();

  blank();
  header('Configuration');
  hr();
  detail('Port', cfg.port);
  detail('Proxy port', cfg.proxyPort);
  detail('Host', cfg.host);
  detail('Data dir', cfg.dataDir);
  blank();

  if (fs.existsSync(CONFIG_FILE)) {
    console.log(`   ${colour(C.dim, `Config file: ${CONFIG_FILE}`)}`);
  } else {
    console.log(`   ${colour(C.dim, 'Using defaults — run "mockoto config edit" to customise')}`);
  }
  blank();
}

async function cmdConfigSet(key, value) {
  const allowed = { port: 'number', proxyPort: 'number', host: 'string', dataDir: 'string' };

  if (!allowed[key]) {
    blank();
    fail(`Unknown config key: ${colour(C.bold, key)}`);
    console.log(`   Valid keys: ${Object.keys(allowed).join(', ')}`);
    blank();
    process.exit(1);
  }

  let parsed = value;
  if (allowed[key] === 'number') {
    parsed = Number(value);
    if (isNaN(parsed) || parsed < 1 || parsed > 65535) {
      fatal(`Invalid port: ${value} — must be a number between 1 and 65535`);
    }
  }

  if (key === 'dataDir') {
    const expanded = value.startsWith('~')
      ? path.join(os.homedir(), value.slice(1))
      : value;
    const resolved = path.resolve(expanded);
    try {
      fs.mkdirSync(resolved, { recursive: true });
    } catch {
      fatal(`Cannot create directory: ${resolved}`);
      return;
    }
    parsed = resolved;
  }

  const cfg = loadConfig();
  cfg[key] = parsed;

  fs.mkdirSync(CONFIG_DIR, { recursive: true });
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2), 'utf8');

  blank();
  success(`${key} set to ${colour(C.bold, String(parsed))}`);
  console.log(`   Restart Mockoto for changes to take effect.`);
  blank();
}

async function cmdConfigEdit() {
  if (!fs.existsSync(CONFIG_FILE)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(DEFAULT_CONFIG, null, 2), 'utf8');
    console.log(`   Created: ${CONFIG_FILE}`);
  }

  const editor =
    process.env.EDITOR ||
    process.env.VISUAL ||
    (process.platform === 'win32' ? 'notepad' : 'nano');

  const result = spawnSync(editor, [CONFIG_FILE], { stdio: 'inherit', shell: true });

  if (result.error) {
    blank();
    fail(`Could not open editor: ${result.error.message}`);
    console.log(`   Set a different editor via the EDITOR environment variable.`);
    console.log(`   Edit manually: ${CONFIG_FILE}`);
    blank();
    process.exit(1);
  }

  if (result.status !== 0) {
    blank();
    fail(`Editor exited with code ${result.status ?? `signal ${result.signal}`}`);
    console.log(`   Edit manually: ${CONFIG_FILE}`);
    blank();
    process.exit(1);
  }

  try {
    JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    blank();
    success('Configuration saved');
    blank();
  } catch {
    blank();
    fail('Configuration file has invalid JSON');
    console.log(`   Fix manually: ${CONFIG_FILE}`);
    blank();
    process.exit(1);
  }
}

async function cmdLogs(options) {
  const lines = parseInt(options.lines ?? '50', 10);
  if (isNaN(lines) || lines < 1) {
    fatal(`Invalid --lines value: ${options.lines} — must be a positive integer`);
  }

  if (!fs.existsSync(LOG_FILE)) {
    blank();
    console.log('   No log file found.');
    console.log(`   Logs are written to: ${LOG_FILE}`);
    console.log('   Start Mockoto to begin logging.');
    blank();
    process.exit(0);
  }

  const content = fs.readFileSync(LOG_FILE, 'utf8');
  const all = content.split('\n').filter((l) => l.trim());
  const tail = all.slice(-lines);

  blank();
  for (const line of tail) {
    try {
      const entry = JSON.parse(line);
      const time = entry.time ? new Date(entry.time).toLocaleTimeString() : '';
      const level = entry.level >= 50 ? colour(C.red, 'ERROR') :
                    entry.level >= 40 ? colour(C.yellow, 'WARN ') :
                    colour(C.dim, 'INFO ');
      console.log(`${colour(C.dim, time)}  ${level}  ${entry.msg ?? line}`);
    } catch {
      console.log(line);
    }
  }
  blank();

  if (options.follow) {
    let fileSize = fs.statSync(LOG_FILE).size;
    fs.watchFile(LOG_FILE, { interval: 500 }, (curr) => {
      if (curr.size < fileSize) {
        // File was truncated/rotated — reset and read from start
        fileSize = 0;
      }
      if (curr.size > fileSize) {
        const fd = fs.openSync(LOG_FILE, 'r');
        const buf = Buffer.alloc(curr.size - fileSize);
        fs.readSync(fd, buf, 0, buf.length, fileSize);
        fs.closeSync(fd);
        fileSize = curr.size;
        process.stdout.write(buf.toString());
      }
    });
    const stopFollow = () => { fs.unwatchFile(LOG_FILE); process.exit(0); };
    process.on('SIGINT',  stopFollow);
    process.on('SIGTERM', stopFollow);  // Docker stop / systemd / kill — also exits cleanly
  }
}

async function cmdLogsClear() {
  if (!fs.existsSync(LOG_FILE)) {
    blank();
    console.log('   No log file found — nothing to clear.');
    blank();
    return;
  }

  const stats = fs.statSync(LOG_FILE);
  const sizeMb = (stats.size / 1024 / 1024).toFixed(1);

  blank();
  console.log(`   Log file: ${colour(C.dim, LOG_FILE)}`);
  console.log(`   Size: ${colour(C.dim, sizeMb + ' MB')}`);
  blank();
  const confirmed = await confirm('   Type "clear" to delete the log file: ', 'clear');
  if (!confirmed) {
    blank();
    console.log('   Cancelled.');
    blank();
    process.exit(0);
  }

  try {
    fs.unlinkSync(LOG_FILE);
    blank();
    success('Log file cleared');
    blank();
  } catch (err) {
    fatal(`Could not clear log file: ${err.message}`);
  }
}

// ─── CLI ─────────────────────────────────────────────────────────────────────

const { Command } = require('commander');
const pkg = require('../package.json');

const program = new Command();

program
  .name('mockoto')
  .description('Mockoto — local API mocking platform')
  .version(pkg.version, '-v, --version')
  .allowExcessArguments(false)
  .configureOutput({
    outputError: (str, write) => {
      if (str.includes('too many arguments') || str.includes('excess argument')) {
        const unknownCmd = process.argv.slice(2).find(a => !a.startsWith('-')) ?? process.argv.slice(2).join(' ');
        blank();
        fail(`Unknown command: '${unknownCmd}'`);
        console.log(`   Run ${colour(C.bold, 'mockoto --help')} to see all available commands.`);
        blank();
      } else {
        write(str);
      }
    },
  })
  .option('-d, --detach', 'Run server in background (terminal stays free)')
  .action((opts) => cmdStart(opts));

program
  .command('stop')
  .description('Stop a background Mockoto server started with --detach')
  .action(cmdStop);

program
  .command('open')
  .description('Open the running Mockoto instance in a browser')
  .action(cmdOpen);

program
  .command('status')
  .description('Show running status and project statistics')
  .action(cmdStatus);

program
  .command('doctor')
  .description('Run health checks on the local environment')
  .action(cmdDoctor);

program
  .command('validate')
  .description('Validate data integrity (requires Mockoto to be running)')
  .action(cmdValidate);

program
  .command('export')
  .description('Create a complete backup of all data')
  .argument('[output]', 'output file path (default: mockoto-backup-<timestamp>.zip)')
  .action(cmdExport);

program
  .command('import')
  .description('Restore data from a backup')
  .argument('<backup>', 'path to a .zip backup file')
  .action(cmdImport);

program
  .command('reset')
  .description('Delete all local data (requires confirmation)')
  .action(cmdReset);

const config = program
  .command('config')
  .description('Manage configuration');

config
  .command('show')
  .description('Display current configuration')
  .action(cmdConfigShow);

config
  .command('set')
  .description('Set a configuration value')
  .argument('<key>', 'config key (port, proxyPort, host, dataDir)')
  .argument('<value>', 'value to set')
  .action(cmdConfigSet);

config
  .command('edit')
  .description('Open configuration file in an editor')
  .action(cmdConfigEdit);

const logs = program
  .command('logs')
  .description('Display application logs')
  .option('-n, --lines <n>', 'number of lines to show', '50')
  .option('-f, --follow', 'follow log output in real time')
  .action(cmdLogs);

logs
  .command('clear')
  .description('Delete the log file')
  .action(cmdLogsClear);

program.parse(process.argv);
