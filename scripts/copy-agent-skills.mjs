/**
 * Copies Mockoto agent skills into dist for the published CLI package.
 * Run automatically after mockoto-be:build (see project.json).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(__dirname, '..');
const srcRoot = path.join(workspaceRoot, '.agents', 'skills');
const destRoot = path.join(workspaceRoot, 'dist', 'apps', 'mockoto-be', 'skills');

const PACKAGES = [
  'mockoto',
  'mockoto-api',
  'mockoto-scaffold',
  'mockoto-switching',
  'mockoto-ui',
];

if (!fs.existsSync(srcRoot)) {
  console.error(`Skills source not found: ${srcRoot}`);
  process.exit(1);
}

fs.mkdirSync(destRoot, { recursive: true });

for (const name of PACKAGES) {
  const src = path.join(srcRoot, name);
  const dest = path.join(destRoot, name);
  if (!fs.existsSync(path.join(src, 'SKILL.md'))) {
    console.error(`Missing ${src}/SKILL.md`);
    process.exit(1);
  }
  fs.rmSync(dest, { recursive: true, force: true });
  fs.cpSync(src, dest, { recursive: true });
  console.log(`✔ skills/${name}`);
}

console.log(`Agent skills copied to ${destRoot}`);
