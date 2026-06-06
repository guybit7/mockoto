import fs from 'fs';
import path from 'path';

/**
 * Resolve the directory containing mockoto* agent skills.
 * Production: dist/apps/mockoto-be/skills (copied at build)
 * Development: .agents/skills in repo root
 */
export function resolveSkillsRoot(): string | null {
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

const _packageNamesCache = new Map<string, string[]>();

/** Discover all mockoto skill package names present in a skills root. Result is cached per root. */
function discoverPackageNames(root: string): string[] {
  const cached = _packageNamesCache.get(root);
  if (cached) return cached;
  const names = !fs.existsSync(root)
    ? []
    : fs
        .readdirSync(root, { withFileTypes: true })
        .filter((e) => e.isDirectory() && e.name.startsWith('mockoto'))
        .filter((e) => fs.existsSync(path.join(root, e.name, 'SKILL.md')))
        .map((e) => e.name)
        .sort();
  _packageNamesCache.set(root, names);
  return names;
}

export type SkillFileEntry = {
  relativePath: string;
  sizeBytes: number;
};

export type SkillPackageInfo = {
  name: string;
  skillMd: string;
  files: SkillFileEntry[];
};

function walkFiles(dir: string, base: string): SkillFileEntry[] {
  const entries: SkillFileEntry[] = [];
  if (!fs.existsSync(dir)) return entries;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const rel = path.join(base, entry.name).replace(/\\/g, '/');
    if (entry.isDirectory()) {
      entries.push(...walkFiles(full, rel));
    } else {
      entries.push({ relativePath: rel, sizeBytes: fs.statSync(full).size });
    }
  }
  return entries;
}

export function listSkillPackages(root: string): SkillPackageInfo[] {
  return discoverPackageNames(root).map((name) => {
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
  // Only serve packages that actually exist in the skills root (prevents enumeration attacks)
  if (!discoverPackageNames(root).includes(skillName)) {
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
