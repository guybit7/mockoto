import { BaseRepository } from '../repositories/base.repository';
import { NotFoundError } from '../errors';

export { NotFoundError };

export abstract class BaseService<
  TEntity,
  TRow extends { id: string },
  TCreateDto,
  TUpdateDto,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  TRepo extends BaseRepository<TRow, any>,
> {
  constructor(protected readonly repository: TRepo) {}

  protected abstract readonly entityName: string;

  protected abstract toEntity(row: TRow): TEntity;

  async findAll(): Promise<TEntity[]> {
    const rows = await this.repository.findAll();
    return rows.map((row) => this.toEntity(row));
  }

  async findById(id: string): Promise<TEntity> {
    const row = await this.repository.findById(id);
    if (!row) throw new NotFoundError(this.entityName, id);
    return this.toEntity(row);
  }

  abstract create(data: TCreateDto): Promise<TEntity>;
  abstract update(id: string, data: TUpdateDto): Promise<TEntity>;

  async delete(id: string): Promise<void> {
    const deleted = await this.repository.delete(id);
    if (!deleted) throw new NotFoundError(this.entityName, id);
  }
}
