import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { ReportStatus, SignalSeverity } from '@prisma/client';

export interface CreateFraudReportDto {
  subjectType: 'LISTING' | 'USER' | 'MESSAGE';
  subjectId: string;
  category: string;
  narrative: string;
  evidence?: Array<{ objectKey: string; mimeType?: string; checksum?: string }>;
}

const CATEGORIES = new Set(['PAYMENT_SCAM', 'IDENTITY_MISREPRESENTATION', 'FAKE_LISTING', 'HARASSMENT', 'PHISHING', 'OTHER']);
const HIGH_RISK = new Set(['PAYMENT_SCAM', 'IDENTITY_MISREPRESENTATION', 'FAKE_LISTING', 'PHISHING']);

@Injectable()
export class FraudReportsService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  async create(reporterId: string, dto: CreateFraudReportDto) {
    if (!CATEGORIES.has(dto.category) || !['LISTING', 'USER', 'MESSAGE'].includes(dto.subjectType)) {
      throw new BadRequestException('Unsupported report category or subject');
    }
    if (!dto.narrative || dto.narrative.trim().length < 20 || dto.narrative.length > 5000) {
      throw new BadRequestException('Narrative must be between 20 and 5000 characters');
    }
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const count = await this.prisma.fraudReport.count({ where: { reporterId, createdAt: { gte: since } } });
    const maxPerDay = Number(process.env.FRAUD_REPORTS_PER_DAY || 5);
    if (count >= maxPerDay) throw new ForbiddenException('Daily report limit reached');
    const duplicate = await this.prisma.fraudReport.findFirst({ where: { reporterId, subjectType: dto.subjectType, subjectId: dto.subjectId, category: dto.category, status: { in: [ReportStatus.OPEN, ReportStatus.INVESTIGATING] } } });
    if (duplicate) throw new BadRequestException('You already have an active report for this subject');

    const ownerId = await this.resolveOwner(dto.subjectType, dto.subjectId);
    const severity = HIGH_RISK.has(dto.category) ? SignalSeverity.HIGH : SignalSeverity.MEDIUM;
    const report = await this.prisma.$transaction(async (tx) => {
      const created = await tx.fraudReport.create({ data: { reporterId, subjectType: dto.subjectType, subjectId: dto.subjectId, category: dto.category, narrative: dto.narrative.trim(), evidence: dto.evidence || undefined, severity } });
      if (ownerId && severity === SignalSeverity.HIGH && process.env.FRAUD_HIGH_SEVERITY_PAYMENT_HOLD !== 'false') {
        await tx.paymentHold.create({ data: { ownerId, reportId: created.id, reason: 'High-severity tenant fraud report pending review' } });
      }
      if (ownerId && process.env.FRAUD_NOTIFY_OWNER !== 'false') {
        await tx.notification.create({ data: { userId: ownerId, title: 'Safety review opened', body: 'We received a safety report related to one of your listings. Please review your account and avoid requesting payment outside RentSafe.' } });
        await tx.fraudReport.update({ where: { id: created.id }, data: { ownerNotifiedAt: new Date() } });
      }
      await this.audit.log(tx, { actorId: reporterId, action: 'FRAUD_REPORT_CREATED', entityType: 'FRAUD_REPORT', entityId: created.id });
      return created;
    });
    return { id: report.id, status: report.status, severity: report.severity };
  }

  async mine(reporterId: string) {
    return this.prisma.fraudReport.findMany({ where: { reporterId }, select: { id: true, subjectType: true, subjectId: true, category: true, severity: true, status: true, createdAt: true, resolution: true }, orderBy: { createdAt: 'desc' } });
  }

  async queue(status?: ReportStatus) {
    return this.prisma.fraudReport.findMany({ where: status ? { status } : { status: { in: [ReportStatus.OPEN, ReportStatus.INVESTIGATING] } }, include: { reporter: { select: { id: true, email: true } }, assignedTo: { select: { id: true, email: true } }, paymentHolds: true }, orderBy: [{ severity: 'desc' }, { createdAt: 'asc' }] });
  }

  async decide(id: string, reviewerId: string, action: 'ASSIGN' | 'INVESTIGATE' | 'RESOLVE' | 'DISMISS' | 'RELEASE_HOLD', resolution?: string) {
    const report = await this.prisma.fraudReport.findUnique({ where: { id }, include: { paymentHolds: true } });
    if (!report) throw new NotFoundException('Fraud report not found');
    if (action !== 'ASSIGN' && action !== 'INVESTIGATE' && !resolution?.trim()) throw new BadRequestException('Resolution is required');
    return this.prisma.$transaction(async (tx) => {
      const data: any = { assignedToId: reviewerId };
      if (action === 'INVESTIGATE') data.status = ReportStatus.INVESTIGATING;
      if (action === 'RESOLVE') { data.status = ReportStatus.RESOLVED; data.resolution = resolution?.trim(); data.resolvedAt = new Date(); }
      if (action === 'DISMISS') { data.status = ReportStatus.DISMISSED; data.resolution = resolution?.trim(); data.resolvedAt = new Date(); }
      const updated = await tx.fraudReport.update({ where: { id }, data });
      if (action === 'RELEASE_HOLD' || action === 'RESOLVE' || action === 'DISMISS') await tx.paymentHold.updateMany({ where: { reportId: id, status: 'PENDING_REVIEW' }, data: { status: 'RELEASED', releasedAt: new Date(), releasedById: reviewerId } });
      await this.audit.log(tx, { actorId: reviewerId, action: `FRAUD_REPORT_${action}`, entityType: 'FRAUD_REPORT', entityId: id, reason: resolution });
      return updated;
    });
  }

  private async resolveOwner(type: string, id: string) {
    if (type === 'USER') {
      const user = await this.prisma.user.findUnique({ where: { id }, select: { id: true, role: true } });
      if (!user) throw new NotFoundException('Reported user not found');
      return user.role === 'OWNER' ? user.id : undefined;
    }
    if (type === 'LISTING') {
      const listing = await this.prisma.listing.findUnique({ where: { id }, select: { property: { select: { ownerId: true } } } });
      if (!listing) throw new NotFoundException('Reported listing not found');
      return listing.property.ownerId;
    }
    return undefined;
  }
}
