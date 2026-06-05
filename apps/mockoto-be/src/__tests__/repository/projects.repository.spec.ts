import { describe, it, expect, beforeEach } from 'vitest';
import { ProjectsRepository } from '../../app/repositories/projects.repository';
import { createTestDb } from '../helpers/db';
import { createTestProject } from '../helpers/factories';
import type { DB } from '../../app/db';

describe('ProjectsRepository', () => {
  let db: DB;
  let repo: ProjectsRepository;

  beforeEach(() => {
    db = createTestDb();
    repo = new ProjectsRepository(db);
  });

  describe('create', () => {
    it('inserts a row and returns it', async () => {
      const row = await createTestProject(db, { name: 'Alpha', baseUrl: 'https://alpha.example.com' });
      expect(row.id).toBeTruthy();
      expect(row.name).toBe('Alpha');
      expect(row.baseUrl).toBe('https://alpha.example.com');
    });

    it('sets createdAt and updatedAt', async () => {
      const row = await createTestProject(db);
      expect(row.createdAt).toBeTypeOf('number');
      expect(row.updatedAt).toBeTypeOf('number');
      expect(row.createdAt).toBeGreaterThan(0);
    });
  });

  describe('findAll', () => {
    it('returns empty array when no projects exist', async () => {
      expect(await repo.findAll()).toEqual([]);
    });

    it('returns all created projects', async () => {
      await createTestProject(db, { name: 'P1', baseUrl: 'https://p1.example.com' });
      await createTestProject(db, { name: 'P2', baseUrl: 'https://p2.example.com' });
      const rows = await repo.findAll();
      expect(rows).toHaveLength(2);
    });
  });

  describe('findById', () => {
    it('returns the project when it exists', async () => {
      const created = await createTestProject(db, { name: 'Findable' });
      const found = await repo.findById(created.id);
      expect(found).not.toBeNull();
      expect(found!.id).toBe(created.id);
    });

    it('returns null for an unknown id', async () => {
      expect(await repo.findById('00000000-0000-0000-0000-000000000000')).toBeNull();
    });
  });

  describe('findByName', () => {
    it('returns the project when name matches', async () => {
      await createTestProject(db, { name: 'UniqueProject' });
      const found = await repo.findByName('UniqueProject');
      expect(found).not.toBeNull();
      expect(found!.name).toBe('UniqueProject');
    });

    it('returns null when name does not match', async () => {
      expect(await repo.findByName('Nonexistent')).toBeNull();
    });

    it('excludes the project when excludeId matches', async () => {
      const p = await createTestProject(db, { name: 'Excludable' });
      const found = await repo.findByName('Excludable', p.id);
      expect(found).toBeNull();
    });

    it('returns the project when excludeId is a different project', async () => {
      await createTestProject(db, { name: 'Keepable' });
      const other = await createTestProject(db, { name: 'Other', baseUrl: 'https://other.example.com' });
      const found = await repo.findByName('Keepable', other.id);
      expect(found).not.toBeNull();
    });
  });

  describe('findByBaseUrl', () => {
    it('returns the project matching the baseUrl', async () => {
      await createTestProject(db, { baseUrl: 'https://exact.example.com' });
      const found = await repo.findByBaseUrl('https://exact.example.com');
      expect(found).not.toBeNull();
    });

    it('returns null when no project matches', async () => {
      expect(await repo.findByBaseUrl('https://unknown.example.com')).toBeNull();
    });
  });

  describe('update', () => {
    it('updates a field and returns the updated row', async () => {
      const project = await createTestProject(db, { name: 'Original' });
      const updated = await repo.update(project.id, { name: 'Updated' });
      expect(updated).not.toBeNull();
      expect(updated!.name).toBe('Updated');
    });

    it('returns null for an unknown id', async () => {
      const updated = await repo.update('00000000-0000-0000-0000-000000000000', { name: 'Ghost' });
      expect(updated).toBeNull();
    });
  });

  describe('delete', () => {
    it('removes the project and returns true', async () => {
      const project = await createTestProject(db);
      const deleted = await repo.delete(project.id);
      expect(deleted).toBe(true);
      expect(await repo.findById(project.id)).toBeNull();
    });

    it('returns false for an unknown id', async () => {
      expect(await repo.delete('00000000-0000-0000-0000-000000000000')).toBe(false);
    });
  });
});
