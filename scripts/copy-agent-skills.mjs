/**
 * Copies Mockoto agent skills into dist for the published CLI package.
 * Run automatically after mockoto-be:build (see project.json).
 *
 * Any folder under .agents/skills/ whose name starts with "mockoto"
 * and contains a SKILL.md is automatically included — no hardcoded list.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(__dirname, '..');
const srcRoot = path.join(workspaceRoot, '.agents', 'skills');
const destRoot = path.join(workspaceRoot, 'dist', 'apps', 'mockoto-be', 'skills');

if (!fs.existsSync(srcRoot)) {
  console.error(`Skills source not found: ${srcRoot}`);
  process.exit(1);
}

const packages = fs
  .readdirSync(srcRoot, { withFileTypes: true })
  .filter((e) => e.isDirectory() && e.name.startsWith('mockoto'))
  .filter((e) => fs.existsSync(path.join(srcRoot, e.name, 'SKILL.md')))
  .map((e) => e.name)
  .sort();

if (packages.length === 0) {
  console.error(`No mockoto skill packages found in ${srcRoot}`);
  process.exit(1);
}

fs.mkdirSync(destRoot, { recursive: true });

for (const name of packages) {
  const src = path.join(srcRoot, name);
  const dest = path.join(destRoot, name);
  fs.rmSync(dest, { recursive: true, force: true });
  fs.cpSync(src, dest, { recursive: true });
  console.log(`✔ skills/${name}`);
}

console.log(`Agent skills copied to ${destRoot}`);
