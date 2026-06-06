import { StatusRepository, StatusCounts } from '../../repositories/system/status.repository';

const startTime = Date.now();

export interface ServerStatus extends StatusCounts {
  status: 'running';
  port: number;
  proxyPort: number;
  uptime: number;
  database: 'ok';
}

export class StatusService {
  constructor(
    private readonly repository: StatusRepository,
    private readonly port: number,
    private readonly proxyPort: number,
  ) {}

  async getStatus(): Promise<ServerStatus> {
    const counts = await this.repository.getCounts();
    return {
      status: 'running',
      port: this.port,
      proxyPort: this.proxyPort,
      uptime: Math.floor((Date.now() - startTime) / 1000),
      database: 'ok',
      ...counts,
    };
  }
}
