#!/usr/bin/env node

const path = require('path');
const fs = require('fs');

const MOCKOTO_SKILL_PACKAGES = [
  'mockoto',
  'mockoto-api',
  'mockoto-scaffold',
  'mockoto-switching',
  'mockoto-ui',
];

function resolveSkillsRoot() {
  const pkgRoot = path.resolve(__dirname, '..');
  const candidates = [
    path.join(pkgRoot, 'dist/apps/mockoto-be/skills'),
    path.join(pkgRoot, '.agents/skills'),
    path.resolve(process.cwd(), '.agents/skills'),
  ];

  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, 'mockoto', 'SKILL.md'))) {
      return dir;
    }
  }
  return null;
}

function printSkillsHelp() {
  console.log(`Usage: mockoto skills <command>

Commands:
  path     Print absolute path to bundled agent skills (for Cursor / OpenCode)
  list     List skill packages and files
  copy     Print shell command to symlink skills into .cursor/skills

Examples:
  mockoto skills path
  mockoto skills list
  mockoto skills copy
`);
}

function cmdSkills(argv) {
  const sub = argv[0];

  if (!sub || sub === '--help' || sub === '-h') {
    printSkillsHelp();
    process.exit(0);
  }

  const root = resolveSkillsRoot();

  if (sub === 'path') {
    if (!root) {
      console.error('Mockoto agent skills not found. Run from an installed package or monorepo root.');
      process.exit(1);
    }
    console.log(root);
    process.exit(0);
  }

  if (sub === 'list') {
    if (!root) {
      console.error('Mockoto agent skills not found.');
      process.exit(1);
    }
    for (const name of MOCKOTO_SKILL_PACKAGES) {
      const dir = path.join(root, name);
      if (!fs.existsSync(path.join(dir, 'SKILL.md'))) continue;
      console.log(`\n${name}/`);
      for (const file of fs.readdirSync(dir)) {
        console.log(`  ${file}`);
      }
    }
    console.log(`\nRoot: ${root}`);
    process.exit(0);
  }

  if (sub === 'copy') {
    if (!root) {
      console.error('Mockoto agent skills not found.');
      process.exit(1);
    }
    const target = path.join(process.cwd(), '.cursor', 'skills');
    const isWin = process.platform === 'win32';
    if (isWin) {
      console.log('# PowerShell — run from your project root:');
      for (const name of MOCKOTO_SKILL_PACKAGES) {
        const src = path.join(root, name);
        if (!fs.existsSync(path.join(src, 'SKILL.md'))) continue;
        console.log(
          `New-Item -ItemType Directory -Force -Path "${target}" | Out-Null; Copy-Item -Recurse -Force "${src}" "${path.join(target, name)}"`,
        );
      }
    } else {
      console.log('# Bash — run from your project root:');
      console.log(`mkdir -p "${target}"`);
      for (const name of MOCKOTO_SKILL_PACKAGES) {
        const src = path.join(root, name);
        if (!fs.existsSync(path.join(src, 'SKILL.md'))) continue;
        console.log(`cp -R "${src}" "${path.join(target, name)}"`);
      }
    }
    console.log(`\n# Or fetch manifest: curl http://localhost:3000/api/skills`);
    process.exit(0);
  }

  printSkillsHelp();
  process.exit(1);
}

const argv = process.argv.slice(2);

if (argv[0] === 'skills') {
  cmdSkills(argv.slice(1));
} else {
  require('../dist/apps/mockoto-be/main.js');
}
