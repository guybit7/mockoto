import fs from 'fs';
import path from 'path';

/** Skill package folder names shipped with the CLI */
export const MOCKOTO_SKILL_PACKAGES = [
  'mockoto',
  'mockoto-api',
  'mockoto-scaffold',
  'mockoto-switching',
  'mockoto-ui',
] as const;

export type MockotoSkillPackage = (typeof MOCKOTO_SKILL_PACKAGES)[number];

/**
 * Resolve the directory containing mockoto* agent skills.
 * Production: dist/apps/mockoto-be/skills (copied at build)
 * Development: .cursor/skills in repo root
 */
export function resolveSkillsRoot(): string | null {
  /** Bundled main.js lives in dist/apps/mockoto-be */
  const beDistRoot = path.resolve(__dirname);

  const candidates = [
    path.join(beDistRoot, 'skills'),
    path.resolve(beDistRoot, '../../../../.agents/skills'),
    path.resolve(process.cwd(), '.agents/skills'),
    path.resolve(process.cwd(), 'node_modules/@guybit7/mockoto-cli/dist/apps/mockoto-be/skills'),
  ];

  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, 'mockoto', 'SKILL.md'))) {
      return dir;
    }
  }

  return null;
}

export type SkillFileEntry = {
  relativePath: string;
  sizeBytes: number;
};

export type SkillPackageInfo = {
  name: MockotoSkillPackage;
  skillMd: string;
  files: SkillFileEntry[];
};

function walkFiles(dir: string, base: string): SkillFileEntry[] {
  const entries: SkillFileEntry[] = [];
  if (!fs.existsSync(dir)) return entries;

  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, name.name);
    const rel = path.join(base, name.name).replace(/\\/g, '/');
    if (name.isDirectory()) {
      entries.push(...walkFiles(full, rel));
    } else {
      entries.push({
        relativePath: rel,
        sizeBytes: fs.statSync(full).size,
      });
    }
  }
  return entries;
}

export function listSkillPackages(root: string): SkillPackageInfo[] {
  return MOCKOTO_SKILL_PACKAGES.filter((name) =>
    fs.existsSync(path.join(root, name, 'SKILL.md')),
  ).map((name) => {
    const pkgDir = path.join(root, name);
    return {
      name,
      skillMd: path.join(pkgDir, 'SKILL.md'),
      files: walkFiles(pkgDir, name),
    };
  });
}

export function readSkillFile(
  root: string,
  skillName: string,
  relativePath: string,
): string | null {
  if (!MOCKOTO_SKILL_PACKAGES.includes(skillName as MockotoSkillPackage)) {
    return null;
  }

  const normalized = relativePath.replace(/\\/g, '/');
  if (normalized.includes('..') || !normalized.startsWith(`${skillName}/`)) {
    return null;
  }

  const full = path.join(root, normalized);
  if (!fs.existsSync(full) || !fs.statSync(full).isFile()) {
    return null;
  }

  return fs.readFileSync(full, 'utf8');
}
