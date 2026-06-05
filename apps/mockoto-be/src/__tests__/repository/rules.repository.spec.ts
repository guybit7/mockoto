import { describe, it, expect, beforeEach } from 'vitest';
import { RulesRepository } from '../../app/repositories/rules.repository';
import { createTestDb } from '../helpers/db';
import { createTestProject, createTestCollection, createTestRule } from '../helpers/factories';
import { ruleLookupHash } from '../../app/utils/rule-hash';
import type { DB } from '../../app/db';

describe('RulesRepository', () => {
  let db: DB;
  let repo: RulesRepository;
  let projectId: string;
  let collectionId: string;

  beforeEach(async () => {
    db = createTestDb();
    repo = new RulesRepository(db);
    const project = await createTestProject(db);
    projectId = project.id;
    const collection = await createTestCollection(db, projectId);
    collectionId = collection.id;
  });

  describe('create', () => {
    it('inserts a rule and returns it', async () => {
      const rule = await createTestRule(db, projectId, collectionId, {
        url: '/api/users',
        requestMethod: 'GET',
      });
      expect(rule.id).toBeTruthy();
      expect(rule.url).toBe('/api/users');
      expect(rule.requestMethod).toBe('GET');
      expect(rule.collectionId).toBe(collectionId);
    });

    it('stores the lookup hash', async () => {
      const rule = await createTestRule(db, projectId, collectionId, {
        url: '/api/users',
        requestMethod: 'GET',
      });
      const expectedHash = ruleLookupHash('/api/users', 'GET', null);
      expect(rule.lookupHash).toBe(expectedHash);
    });
  });

  describe('findAll', () => {
    it('returns all rules', async () => {
      await createTestRule(db, projectId, collectionId, { url: '/api/a', requestMethod: 'GET' });
      await createTestRule(db, projectId, collectionId, { url: '/api/b', requestMethod: 'POST' });
      expect(await repo.findAll()).toHaveLength(2);
    });
  });

  describe('findById', () => {
    it('returns the rule when it exists', async () => {
      const rule = await createTestRule(db, projectId, collectionId);
      const found = await repo.findById(rule.id);
      expect(found?.id).toBe(rule.id);
    });

    it('returns null for unknown id', async () => {
      expect(await repo.findById('00000000-0000-0000-0000-000000000000')).toBeNull();
    });
  });

  describe('findByCollection', () => {
    it('returns rules belonging to the collection', async () => {
      const col2 = await createTestCollection(db, projectId);
      await createTestRule(db, projectId, collectionId, { url: '/api/mine', requestMethod: 'GET' });
      await createTestRule(db, projectId, col2.id, { url: '/api/other', requestMethod: 'GET' });

      const rows = await repo.findByCollection(collectionId);
      expect(rows).toHaveLength(1);
      expect(rows[0].url).toBe('/api/mine');
    });

    it('returns empty array when no rules exist for the collection', async () => {
      expect(await repo.findByCollection(collectionId)).toEqual([]);
    });
  });

  describe('findByLookup', () => {
    it('returns the rule matching the exact hash', async () => {
      const rule = await createTestRule(db, projectId, collectionId, {
        url: '/api/users',
        requestMethod: 'GET',
      });
      const hash = ruleLookupHash('/api/users', 'GET', null);
      const found = await repo.findByLookup(collectionId, 'GET', hash);
      expect(found?.id).toBe(rule.id);
    });

    it('returns null for an unknown hash', async () => {
      const hash = ruleLookupHash('/api/unknown', 'GET', null);
      expect(await repo.findByLookup(collectionId, 'GET', hash)).toBeNull();
    });

    it('does not return a disabled rule', async () => {
      await createTestRule(db, projectId, collectionId, {
        url: '/api/disabled',
        requestMethod: 'GET',
        isEnabled: false,
      });
      const hash = ruleLookupHash('/api/disabled', 'GET', null);
      expect(await repo.findByLookup(collectionId, 'GET', hash)).toBeNull();
    });
  });

  describe('findByMethodAndCollection', () => {
    it('returns enabled rules matching the method and collection', async () => {
      await createTestRule(db, projectId, collectionId, { url: '/api/a', requestMethod: 'GET' });
      await createTestRule(db, projectId, collectionId, { url: '/api/b', requestMethod: 'GET' });
      await createTestRule(db, projectId, collectionId, { url: '/api/c', requestMethod: 'POST' });

      const rows = await repo.findByMethodAndCollection(collectionId, 'GET');
      expect(rows).toHaveLength(2);
    });

    it('excludes disabled rules', async () => {
      await createTestRule(db, projectId, collectionId, {
        url: '/api/disabled',
        requestMethod: 'GET',
        isEnabled: false,
      });
      expect(await repo.findByMethodAndCollection(collectionId, 'GET')).toHaveLength(0);
    });
  });

  describe('update', () => {
    it('updates a field and returns the updated row', async () => {
      const rule = await createTestRule(db, projectId, collectionId);
      const updated = await repo.update(rule.id, { url: '/api/updated' });
      expect(updated!.url).toBe('/api/updated');
    });

    it('returns null for unknown id', async () => {
      expect(await repo.update('00000000-0000-0000-0000-000000000000', { url: '/api/x' })).toBeNull();
    });
  });

  describe('delete', () => {
    it('removes the rule and returns true', async () => {
      const rule = await createTestRule(db, projectId, collectionId);
      expect(await repo.delete(rule.id)).toBe(true);
      expect(await repo.findById(rule.id)).toBeNull();
    });

    it('returns false for unknown id', async () => {
      expect(await repo.delete('00000000-0000-0000-0000-000000000000')).toBe(false);
    });
  });
});
