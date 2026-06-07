import { randomUUID } from 'crypto';
import type { DB } from '../../app/db';
import { ProjectsRepository } from '../../app/repositories/projects.repository';
import { CollectionsRepository } from '../../app/repositories/collections.repository';
import { RulesRepository } from '../../app/repositories/rules.repository';
import { RuleResponsesRepository } from '../../app/repositories/rule-responses.repository';
import type { ProjectRow } from '../../app/repositories/projects.repository';
import type { CollectionRow } from '../../app/repositories/collections.repository';
import type { RuleRow } from '../../app/repositories/rules.repository';
import type { RuleResponseRow } from '../../app/repositories/rule-responses.repository';
import { ruleLookupHash } from '../../app/utils/rule-hash';

let _tick = 0;
const now = () => Math.floor(Date.now() / 1000) + _tick++;

// ── Projects ──────────────────────────────────────────────────────────────────

export interface ProjectOverrides {
  id?: string;
  name?: string;
  baseUrl?: string;
  description?: string | null;
  isFavorite?: boolean;
  ownerName?: string;
  logoUrl?: string | null;
  logoBase64?: string | null;
}

export async function createTestProject(
  db: DB,
  overrides: ProjectOverrides = {},
): Promise<ProjectRow> {
  const repo = new ProjectsRepository(db);
  const t = now();
  return repo.create({
    id: overrides.id ?? randomUUID(),
    name: overrides.name ?? `Project-${randomUUID().slice(0, 8)}`,
    baseUrl: overrides.baseUrl ?? `https://${randomUUID().slice(0, 8)}.example.com`,
    description: overrides.description ?? null,
    isFavorite: overrides.isFavorite ?? false,
    ownerName: overrides.ownerName ?? 'test-team',
    logoUrl: overrides.logoUrl ?? null,
    logoBase64: overrides.logoBase64 ?? null,
    createdAt: t,
    updatedAt: t,
  });
}

// ── Collections ───────────────────────────────────────────────────────────────

export interface CollectionOverrides {
  id?: string;
  name?: string;
  description?: string | null;
  mode?: 'local' | 'proxy';
  recordingStrategy?: 'none' | 'all' | 'success' | 'error';
  isActive?: boolean;
  isFavorite?: boolean;
  source?: 'manual' | 'recording' | 'har' | 'agent' | null;
  ownerName?: string | null;
}

export async function createTestCollection(
  db: DB,
  projectId: string,
  overrides: CollectionOverrides = {},
): Promise<CollectionRow> {
  const repo = new CollectionsRepository(db);
  const t = now();
  const data = {
    id: overrides.id ?? randomUUID(),
    projectId,
    name: overrides.name ?? `Collection-${randomUUID().slice(0, 8)}`,
    description: overrides.description ?? null,
    mode: overrides.mode ?? 'local',
    recordingStrategy: overrides.recordingStrategy ?? 'none',
    isActive: overrides.isActive ?? false,
    isFavorite: overrides.isFavorite ?? false,
    source: overrides.source ?? null,
    ownerName: overrides.ownerName ?? null,
    createdAt: t,
    updatedAt: t,
  };

  return overrides.isActive ? repo.exclusiveCreate(data) : repo.create(data);
}

// ── Rules ─────────────────────────────────────────────────────────────────────

export interface RuleOverrides {
  id?: string;
  url?: string;
  requestMethod?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
  requestBody?: string | null;
  description?: string | null;
  passthrough?: boolean;
  type?: 'manual' | 'recorded' | null;
  isFavorite?: boolean;
  isEnabled?: boolean;
}

export async function createTestRule(
  db: DB,
  projectId: string,
  collectionId: string,
  overrides: RuleOverrides = {},
): Promise<RuleRow> {
  const repo = new RulesRepository(db);
  const url = overrides.url ?? '/api/test';
  const method = overrides.requestMethod ?? 'GET';
  const body = overrides.requestBody ?? null;
  const t = now();
  return repo.create({
    id: overrides.id ?? randomUUID(),
    projectId,
    collectionId,
    url,
    requestMethod: method,
    description: overrides.description ?? null,
    requestBody: body,
    lookupHash: ruleLookupHash(url, method, body),
    passthrough: overrides.passthrough ?? false,
    type: overrides.type ?? null,
    isFavorite: overrides.isFavorite ?? false,
    isEnabled: overrides.isEnabled ?? true,
    createdAt: t,
    updatedAt: t,
  });
}

// ── Rule Responses ────────────────────────────────────────────────────────────

export interface RuleResponseOverrides {
  id?: string;
  name?: string | null;
  statusCode?: number;
  headers?: string | null;
  body?: string | null;
  isActive?: boolean;
  isFavorite?: boolean;
  isError?: boolean;
  latency?: number | null;
}

export async function createTestRuleResponse(
  db: DB,
  ruleId: string,
  overrides: RuleResponseOverrides = {},
): Promise<RuleResponseRow> {
  const repo = new RuleResponsesRepository(db);
  const t = now();
  const data = {
    id: overrides.id ?? randomUUID(),
    ruleId,
    name: overrides.name ?? null,
    statusCode: overrides.statusCode ?? 200,
    headers: overrides.headers ?? null,
    body: overrides.body ?? null,
    isActive: overrides.isActive ?? false,
    isFavorite: overrides.isFavorite ?? false,
    isError: overrides.isError ?? false,
    latency: overrides.latency ?? null,
    createdAt: t,
    updatedAt: t,
  };

  return overrides.isActive ? repo.exclusiveCreate(data) : repo.create(data);
}
