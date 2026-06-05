import { describe, it, expect, beforeEach } from 'vitest';
import { CollectionsRepository } from '../../app/repositories/collections.repository';
import { createTestDb } from '../helpers/db';
import { createTestProject, createTestCollection } from '../helpers/factories';
import type { DB } from '../../app/db';

describe('CollectionsRepository', () => {
  let db: DB;
  let repo: CollectionsRepository;
  let projectId: string;

  beforeEach(async () => {
    db = createTestDb();
    repo = new CollectionsRepository(db);
    const project = await createTestProject(db);
    projectId = project.id;
  });

  describe('create', () => {
    it('inserts a collection and returns it', async () => {
      const row = await createTestCollection(db, projectId, { name: 'My Collection' });
      expect(row.id).toBeTruthy();
      expect(row.name).toBe('My Collection');
      expect(row.projectId).toBe(projectId);
    });

    it('defaults isActive to false', async () => {
      const row = await createTestCollection(db, projectId);
      expect(row.isActive).toBe(false);
    });
  });

  describe('findAll', () => {
    it('returns all collections across projects', async () => {
      const p2 = await createTestProject(db);
      await createTestCollection(db, projectId, { name: 'C1' });
      await createTestCollection(db, p2.id, { name: 'C2' });
      expect(await repo.findAll()).toHaveLength(2);
    });
  });

  describe('findById', () => {
    it('returns the collection when it exists', async () => {
      const col = await createTestCollection(db, projectId);
      const found = await repo.findById(col.id);
      expect(found?.id).toBe(col.id);
    });

    it('returns null for unknown id', async () => {
      expect(await repo.findById('00000000-0000-0000-0000-000000000000')).toBeNull();
    });
  });

  describe('findByProject', () => {
    it('returns only collections belonging to the project', async () => {
      const p2 = await createTestProject(db);
      await createTestCollection(db, projectId, { name: 'Belongs' });
      await createTestCollection(db, p2.id, { name: 'Other' });

      const rows = await repo.findByProject(projectId);
      expect(rows).toHaveLength(1);
      expect(rows[0].name).toBe('Belongs');
    });

    it('returns collections ordered by createdAt ascending', async () => {
      await createTestCollection(db, projectId, { name: 'First' });
      await createTestCollection(db, projectId, { name: 'Second' });
      const rows = await repo.findByProject(projectId);
      expect(rows[0].name).toBe('First');
      expect(rows[1].name).toBe('Second');
    });
  });

  describe('findActiveByProject', () => {
    it('returns null when no collection is active', async () => {
      await createTestCollection(db, projectId, { isActive: false });
      expect(await repo.findActiveByProject(projectId)).toBeNull();
    });

    it('returns the active collection', async () => {
      await createTestCollection(db, projectId, { name: 'Active', isActive: true });
      const found = await repo.findActiveByProject(projectId);
      expect(found?.name).toBe('Active');
    });
  });

  describe('findByNameInProject', () => {
    it('returns the collection when name matches in the same project', async () => {
      const col = await createTestCollection(db, projectId, { name: 'UniqueName' });
      const found = await repo.findByNameInProject(projectId, 'UniqueName');
      expect(found?.id).toBe(col.id);
    });

    it('excludes the collection when excludeId matches', async () => {
      const col = await createTestCollection(db, projectId, { name: 'ExcludeMe' });
      expect(await repo.findByNameInProject(projectId, 'ExcludeMe', col.id)).toBeNull();
    });
  });

  describe('exclusiveCreate', () => {
    it('creates an active collection and deactivates others', async () => {
      const first = await createTestCollection(db, projectId, { name: 'First', isActive: true });
      const second = await createTestCollection(db, projectId, { name: 'Second', isActive: true });

      const firstAfter = await repo.findById(first.id);
      const secondAfter = await repo.findById(second.id);

      expect(firstAfter!.isActive).toBe(false);
      expect(secondAfter!.isActive).toBe(true);
    });

    it('only one collection is active after multiple exclusive creates', async () => {
      for (const name of ['A', 'B', 'C']) {
        await createTestCollection(db, projectId, { name, isActive: true });
      }
      const all = await repo.findByProject(projectId);
      const activeCount = all.filter((c) => c.isActive).length;
      expect(activeCount).toBe(1);
    });
  });

  describe('exclusiveActivate', () => {
    it('activates the target and deactivates all others in the project', async () => {
      const a = await createTestCollection(db, projectId, { name: 'A', isActive: true });
      const b = await createTestCollection(db, projectId, { name: 'B' });

      await repo.exclusiveActivate(b.id, projectId, { updatedAt: Math.floor(Date.now() / 1000) });

      expect((await repo.findById(a.id))!.isActive).toBe(false);
      expect((await repo.findById(b.id))!.isActive).toBe(true);
    });

    it('returns null for an unknown collection id', async () => {
      const result = await repo.exclusiveActivate(
        '00000000-0000-0000-0000-000000000000',
        projectId,
        {},
      );
      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('updates fields and returns the updated row', async () => {
      const col = await createTestCollection(db, projectId, { name: 'Old Name' });
      const updated = await repo.update(col.id, { name: 'New Name' });
      expect(updated!.name).toBe('New Name');
    });
  });

  describe('delete', () => {
    it('removes the collection and returns true', async () => {
      const col = await createTestCollection(db, projectId);
      expect(await repo.delete(col.id)).toBe(true);
      expect(await repo.findById(col.id)).toBeNull();
    });

    it('returns false for unknown id', async () => {
      expect(await repo.delete('00000000-0000-0000-0000-000000000000')).toBe(false);
    });
  });
});
