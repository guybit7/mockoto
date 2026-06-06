import { BaseRepository, DataCounts } from '../base.repository';

export type StatusCounts = DataCounts;

export class StatusRepository extends BaseRepository {
  async getCounts(): Promise<StatusCounts> {
    return this.getTableCounts();
  }
}
