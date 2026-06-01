import { randomUUID } from 'crypto';
import {
  Collection,
  CreateCollectionDto,
  UpdateCollectionDto,
  COLLECTION_MODES,
  RECORDING_STRATEGIES,
  COLLECTION_SOURCES,
} from '@mockoto/shared';
import { CollectionsRepository, CollectionRow } from '../repositories/collections.repository';
import { NotFoundError, NoActiveCollectionError, ConflictError } from '../errors';

// ─── DB value parsers ──────────────────────────────────────────────────────────
// The DB CHECK constraints guarantee these values are valid; the parsers
// enforce that at the TypeScript boundary so the rest of the app is fully typed.

function parseMode(value: string): Collection['mode'] {
  if (COLLECTION_MODES.includes(value as Collection['mode'])) {
    return value as Collection['mode'];
  }
  throw new Error(`Invalid mode from DB: ${value}`);
}

function parseRecordingStrategy(value: string): Collection['recordingStrategy'] {
  if (RECORDING_STRATEGIES.includes(value as Collection['recordingStrategy'])) {
    return value as Collection['recordingStrategy'];
  }
  throw new Error(`Invalid recordingStrategy from DB: ${value}`);
}

function parseSource(value: string | null): Collection['source'] {
  if (!value) return undefined;
  if (COLLECTION_SOURCES.includes(value as NonNullable<Collection['source']>)) {
    return value as Collection['source'];
  }
  return undefined;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export class CollectionsService {
  constructor(private readonly repository: CollectionsRepository) {}

  private toEntity(row: CollectionRow): Collection {
    return {
      id: row.id,
      projectId: row.projectId,
      name: row.name,
      description: row.description ?? undefined,
      mode: parseMode(row.mode),
      recordingStrategy: parseRecordingStrategy(row.recordingStrategy),
      source: parseSource(row.source),
      isActive: row.isActive,
      isFavorite: row.isFavorite,
      ownerName: row.ownerName ?? undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async findAll(): Promise<Collection[]> {
    const rows = await this.repository.findAll();
    return rows.map((r) => this.toEntity(r));
  }

  async findById(id: string): Promise<Collection> {
    const row = await this.repository.findById(id);
    if (!row) throw new NotFoundError('Collection', id);
    return this.toEntity(row);
  }

  async findByProject(projectId: string): Promise<Collection[]> {
    const rows = await this.repository.findByProject(projectId);
    return rows.map((r) => this.toEntity(r));
  }

  async getActiveCollection(projectId: string): Promise<Collection> {
    const row = await this.repository.findActiveByProject(projectId);
    if (!row) throw new NoActiveCollectionError(projectId);
    return this.toEntity(row);
  }

  async create(data: CreateCollectionDto): Promise<Collection> {
    if (await this.repository.findByNameInProject(data.projectId, data.name)) {
      throw new ConflictError(`A collection named "${data.name}" already exists in this project`);
    }
    const now = Math.floor(Date.now() / 1000);
    const insert = {
      id: randomUUID(),
      ...data,
      isActive: data.isActive ?? false,
      createdAt: now,
      updatedAt: now,
    };

    const row = insert.isActive
      ? await this.repository.exclusiveCreate(insert)
      : await this.repository.create(insert);
    return this.toEntity(row);
  }

  async update(id: string, data: UpdateCollectionDto): Promise<Collection> {
    const now = Math.floor(Date.now() / 1000);
    const current = await this.repository.findById(id);
    if (!current) throw new NotFoundError('Collection', id);

    if (data.name && (await this.repository.findByNameInProject(current.projectId, data.name, id))) {
      throw new ConflictError(`A collection named "${data.name}" already exists in this project`);
    }

    if (data.isActive === true) {
      const row = await this.repository.exclusiveActivate(id, current.projectId, {
        ...data,
        updatedAt: now,
      });
      if (!row) throw new NotFoundError('Collection', id);
      return this.toEntity(row);
    }

    const row = await this.repository.update(id, { ...data, updatedAt: now });
    if (!row) throw new NotFoundError('Collection', id);
    return this.toEntity(row);
  }

  async delete(id: string): Promise<void> {
    const deleted = await this.repository.delete(id);
    if (!deleted) throw new NotFoundError('Collection', id);
  }
}
