import { randomUUID } from 'crypto';
// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  Collection,
  CreateCollectionDto,
  UpdateCollectionDto,
  COLLECTION_MODES,
  RECORDING_STRATEGIES,
  COLLECTION_SOURCES,
} from '@mockoto/shared';
import {
  CollectionsRepository,
  CollectionRow,
} from '../repositories/collections.repository';
import { BaseService, NotFoundError } from './base.service';

// --------------------
// Parsers (safe boundary)
// --------------------
function parseMode(value: string): Collection['mode'] {
  if (COLLECTION_MODES.includes(value as any)) {
    return value as Collection['mode'];
  }
  throw new Error(`Invalid mode from DB: ${value}`);
}

function parseRecordingStrategy(
  value: string,
): Collection['recordingStrategy'] {
  if (RECORDING_STRATEGIES.includes(value as any)) {
    return value as Collection['recordingStrategy'];
  }
  throw new Error(`Invalid recordingStrategy from DB: ${value}`);
}

function parseSource(value: string | null): Collection['source'] {
  if (!value) return undefined;

  if (COLLECTION_SOURCES.includes(value as any)) {
    return value as Collection['source'];
  }

  return undefined;
}

// --------------------
// Service
// --------------------
export class CollectionsService extends BaseService<
  Collection,
  CollectionRow,
  CreateCollectionDto,
  UpdateCollectionDto,
  CollectionsRepository
> {
  protected readonly entityName = 'Collection';

  constructor(repository: CollectionsRepository) {
    super(repository);
  }

  protected toEntity(row: CollectionRow): Collection {
    return {
      id: row.id,
      projectId: row.projectId,
      name: row.name,
      description: row.description ?? undefined,
      mode: parseMode(row.mode),
      recordingStrategy: parseRecordingStrategy(row.recordingStrategy),
      source: parseSource(row.source),
      isActive: !!row.isActive,
      ownerName: row.ownerName ?? undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async create(data: CreateCollectionDto): Promise<Collection> {
    const now = Math.floor(Date.now() / 1000);

    const row = await this.repository.create({
      id: randomUUID(),
      ...data,
      isActive: data.isActive ?? false,
      createdAt: now,
      updatedAt: now,
    });

    return this.toEntity(row);
  }

  async update(id: string, data: UpdateCollectionDto): Promise<Collection> {
    const updatedRow = await this.repository.update(id, {
      ...data,
      updatedAt: Math.floor(Date.now() / 1000),
    });

    if (!updatedRow) throw new NotFoundError(this.entityName, id);

    return this.toEntity(updatedRow);
  }

  async getActiveCollection(projectId: string): Promise<Collection> {
    const row = await this.repository.findActiveByProject(projectId);
    if (!row) throw new NotFoundError('Active Collection', projectId);

    return this.toEntity(row);
  }
}
