import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { SafetyService } from './safety.service';

@Processor('safety-lifecycle')
@Injectable()
export class SafetyLifecycleProcessor
  extends WorkerHost
  implements OnModuleInit
{
  constructor(
    private readonly safety: SafetyService,
    @InjectQueue('safety-lifecycle') private readonly queue: Queue,
  ) {
    super();
  }
  async onModuleInit() {
    await this.queue.add('expiry-scan', {}, {
      repeat: { every: 5 * 60 * 1000 },
      jobId: 'safety-expiry-scan',
    } as any);
    await this.queue.add('outbox-drain', {}, {
      repeat: { every: 2 * 1000 },
      jobId: 'safety-outbox-drain',
    } as any);
  }
  async process(job: Job) {
    if (job.name === 'expiry-scan') return this.safety.scanExpired();
    if (job.name === 'outbox-drain') return this.safety.processOutboxBatch();
  }
}
