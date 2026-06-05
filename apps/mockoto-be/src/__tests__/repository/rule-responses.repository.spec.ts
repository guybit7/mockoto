import { describe, it, expect, beforeEach } from 'vitest';
import { RuleResponsesRepository } from '../../app/repositories/rule-responses.repository';
import { createTestDb } from '../helpers/db';
import {
  createTestProject,
  createTestCollection,
  createTestRule,
  createTestRuleResponse,
} from '../helpers/factories';
import type { DB } from '../../app/db';

describe('RuleResponsesRepository', () => {
  let db: DB;
  let repo: RuleResponsesRepository;
  let ruleId: string;
  let projectId: string;
  let collectionId: string;

  beforeEach(async () => {
    db = createTestDb();
    repo = new RuleResponsesRepository(db);
    const project = await createTestProject(db);
    projectId = project.id;
    const collection = await createTestCollection(db, projectId);
    collectionId = collection.id;
    const rule = await createTestRule(db, projectId, collectionId);
    ruleId = rule.id;
  });

  describe('create', () => {
    it('inserts a response and returns it', async () => {
      const resp = await createTestRuleResponse(db, ruleId, { statusCode: 201 });
      expect(resp.id).toBeTruthy();
      expect(resp.ruleId).toBe(ruleId);
      expect(resp.statusCode).toBe(201);
    });

    it('defaults isActive to false', async () => {
      const resp = await createTestRuleResponse(db, ruleId);
      expect(resp.isActive).toBe(false);
    });
  });

  describe('findAll', () => {
    it('returns all responses', async () => {
      await createTestRuleResponse(db, ruleId);
      await createTestRuleResponse(db, ruleId);
      expect(await repo.findAll()).toHaveLength(2);
    });
  });

  describe('findById', () => {
    it('returns the response when it exists', async () => {
      const resp = await createTestRuleResponse(db, ruleId);
      const found = await repo.findById(resp.id);
      expect(found?.id).toBe(resp.id);
    });

    it('returns null for unknown id', async () => {
      expect(await repo.findById('00000000-0000-0000-0000-000000000000')).toBeNull();
    });
  });

  describe('findByRuleId', () => {
    it('returns responses for the rule', async () => {
      const rule2 = await createTestRule(db, projectId, collectionId, { url: '/api/other', requestMethod: 'POST' });
      await createTestRuleResponse(db, ruleId, { name: 'Mine' });
      await createTestRuleResponse(db, rule2.id, { name: 'Other' });

      const rows = await repo.findByRuleId(ruleId);
      expect(rows).toHaveLength(1);
      expect(rows[0].name).toBe('Mine');
    });
  });

  describe('findByRuleIds', () => {
    it('returns responses for multiple rules', async () => {
      const rule2 = await createTestRule(db, projectId, collectionId, { url: '/api/r2', requestMethod: 'POST' });
      await createTestRuleResponse(db, ruleId);
      await createTestRuleResponse(db, rule2.id);

      const rows = await repo.findByRuleIds([ruleId, rule2.id]);
      expect(rows).toHaveLength(2);
    });

    it('returns empty array for empty id list', async () => {
      expect(await repo.findByRuleIds([])).toEqual([]);
    });
  });

  describe('findActiveByRuleId', () => {
    it('returns the active response', async () => {
      await createTestRuleResponse(db, ruleId, { isActive: false });
      await createTestRuleResponse(db, ruleId, { isActive: true });

      const active = await repo.findActiveByRuleId(ruleId);
      expect(active).not.toBeNull();
      expect(active!.isActive).toBe(true);
    });

    it('returns null when no response is active', async () => {
      await createTestRuleResponse(db, ruleId, { isActive: false });
      expect(await repo.findActiveByRuleId(ruleId)).toBeNull();
    });
  });

  describe('exclusiveCreate', () => {
    it('creates an active response and deactivates others', async () => {
      const first = await createTestRuleResponse(db, ruleId, { isActive: true });
      const second = await createTestRuleResponse(db, ruleId, { isActive: true });

      const firstAfter = await repo.findById(first.id);
      const secondAfter = await repo.findById(second.id);

      expect(firstAfter!.isActive).toBe(false);
      expect(secondAfter!.isActive).toBe(true);
    });

    it('ensures only one active response exists after multiple exclusive creates', async () => {
      for (let i = 0; i < 3; i++) {
        await createTestRuleResponse(db, ruleId, { isActive: true });
      }
      const all = await repo.findByRuleId(ruleId);
      expect(all.filter((r) => r.isActive)).toHaveLength(1);
    });
  });

  describe('exclusiveActivate', () => {
    it('activates the target and deactivates all others', async () => {
      const a = await createTestRuleResponse(db, ruleId, { isActive: true });
      const b = await createTestRuleResponse(db, ruleId, { isActive: false });

      await repo.exclusiveActivate(b.id, ruleId, { updatedAt: Math.floor(Date.now() / 1000) });

      expect((await repo.findById(a.id))!.isActive).toBe(false);
      expect((await repo.findById(b.id))!.isActive).toBe(true);
    });

    it('returns null for an unknown id', async () => {
      const result = await repo.exclusiveActivate(
        '00000000-0000-0000-0000-000000000000',
        ruleId,
        {},
      );
      expect(result).toBeNull();
    });
  });

  describe('deleteAndPromote', () => {
    it('deletes the response', async () => {
      const resp = await createTestRuleResponse(db, ruleId);
      await repo.deleteAndPromote(resp.id, ruleId, false, Math.floor(Date.now() / 1000));
      expect(await repo.findById(resp.id)).toBeNull();
    });

    it('promotes the latest sibling when the deleted response was active', async () => {
      const first = await createTestRuleResponse(db, ruleId, { isActive: false });
      const active = await createTestRuleResponse(db, ruleId, { isActive: true });

      await repo.deleteAndPromote(active.id, ruleId, true, Math.floor(Date.now() / 1000));

      expect(await repo.findById(active.id)).toBeNull();
      const promoted = await repo.findById(first.id);
      expect(promoted!.isActive).toBe(true);
    });

    it('does not promote any sibling when the deleted response was not active', async () => {
      const inactive = await createTestRuleResponse(db, ruleId, { isActive: false });
      const active = await createTestRuleResponse(db, ruleId, { isActive: true });

      await repo.deleteAndPromote(inactive.id, ruleId, false, Math.floor(Date.now() / 1000));

      expect((await repo.findById(active.id))!.isActive).toBe(true);
    });

    it('leaves no active response when the only response is deleted', async () => {
      const resp = await createTestRuleResponse(db, ruleId, { isActive: true });
      await repo.deleteAndPromote(resp.id, ruleId, true, Math.floor(Date.now() / 1000));
      expect(await repo.findActiveByRuleId(ruleId)).toBeNull();
    });
  });

  describe('update', () => {
    it('updates a field and returns the updated row', async () => {
      const resp = await createTestRuleResponse(db, ruleId, { statusCode: 200 });
      const updated = await repo.update(resp.id, { statusCode: 404 });
      expect(updated!.statusCode).toBe(404);
    });

    it('returns null for unknown id', async () => {
      expect(await repo.update('00000000-0000-0000-0000-000000000000', { statusCode: 404 })).toBeNull();
    });
  });

  describe('delete', () => {
    it('removes the response and returns true', async () => {
      const resp = await createTestRuleResponse(db, ruleId);
      expect(await repo.delete(resp.id)).toBe(true);
      expect(await repo.findById(resp.id)).toBeNull();
    });

    it('returns false for unknown id', async () => {
      expect(await repo.delete('00000000-0000-0000-0000-000000000000')).toBe(false);
    });
  });
});
