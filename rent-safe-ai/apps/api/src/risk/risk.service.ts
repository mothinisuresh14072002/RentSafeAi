import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { RuleRegistry } from './rule-registry';
import { SignalStatus } from '@prisma/client';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class RiskService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: RuleRegistry,
    @InjectQueue('risk-evaluation') private readonly evalQueue: Queue,
  ) {}

  /**
   * Enqueue an idempotent risk evaluation for an entity.
   * The processor will run all applicable rules and upsert signals.
   */
  async enqueueEvaluation(entityType: string, entityId: string) {
    await this.evalQueue.add(
      'evaluate',
      { entityType, entityId },
      {
        // Deduplication key: one active job per entity at a time
        jobId: `eval:${entityType}:${entityId}`,
      },
    );
  }

  /**
   * Core idempotent upsert: only creates a signal if no ACTIVE signal with the
   * same ruleCode + entityType + entityId already exists.
   * Returns the existing signal if already present (idempotent re-run guarantee).
   */
  async upsertSignal(
    ruleCode: string,
    entityType: string,
    entityId: string,
    evidenceJson: object,
  ) {
    const rule = this.registry.get(ruleCode);
    if (!rule) throw new Error(`Unknown rule code: ${ruleCode}`);

    // Idempotency check — do not duplicate ACTIVE signals
    const existing = await this.prisma.riskSignal.findFirst({
      where: {
        ruleCode,
        entityType,
        entityId,
        status: SignalStatus.ACTIVE,
      },
    });
    if (existing) return { signal: existing, created: false };

    const signal = await this.prisma.riskSignal.create({
      data: {
        ruleCode,
        severity: rule.severity,
        entityType,
        entityId,
        evidenceJson: evidenceJson as any,
        status: SignalStatus.ACTIVE,
      },
    });

    return { signal, created: true };
  }

  /** Resolve a risk signal with a reviewer explanation. */
  async resolveSignal(
    signalId: string,
    reviewerId: string,
    resolution: string,
  ) {
    return this.prisma.riskSignal.update({
      where: { id: signalId },
      data: {
        status: SignalStatus.RESOLVED,
        reviewerResolution: resolution,
      },
    });
  }

  /** Returns all ACTIVE signals for an entity sorted by severity. */
  async getActiveSignals(entityType: string, entityId: string) {
    return this.prisma.riskSignal.findMany({
      where: { entityType, entityId, status: SignalStatus.ACTIVE },
      orderBy: { severity: 'asc' },
    });
  }

  /** Returns whether any ACTIVE hard-block rule applies to an entity. */
  async hasHardBlock(entityType: string, entityId: string): Promise<boolean> {
    const signals = await this.getActiveSignals(entityType, entityId);
    return signals.some((s) => this.registry.isHardBlock(s.ruleCode));
  }

  /** Returns all registered rules (for admin configuration view). */
  getRuleRegistry() {
    return this.registry.getAll();
  }
}
