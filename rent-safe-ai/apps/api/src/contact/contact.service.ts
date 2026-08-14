import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { ContactStatus } from '@prisma/client';

@Injectable()
export class ContactService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async requestContact(tenantId: string, listingId: string, reason: string) {
    return this.prisma.$transaction(async (tx) => {
      const listing = await tx.listing.findUnique({
        where: { id: listingId },
        include: { property: true }
      });

      if (!listing) throw new NotFoundException('Listing not found');
      if (listing.property.ownerId === tenantId) throw new BadRequestException('Owner cannot request own contact');

      const existing = await tx.contactRequest.findFirst({
        where: { tenantId, listingId }
      });
      if (existing) throw new BadRequestException('Contact request already exists');

      const request = await tx.contactRequest.create({
        data: {
          tenantId,
          listingId,
          status: ContactStatus.PENDING,
        }
      });

      await this.audit.log(tx, { actorId: tenantId, action: 'CONTACT_REQUEST_CREATED', entityType: 'ContactRequest', entityId: request.id, reason });
      return request;
    });
  }

  async grantConsent(ownerId: string, requestId: string, reason: string) {
    return this.prisma.$transaction(async (tx) => {
      const request = await tx.contactRequest.findUnique({
        where: { id: requestId },
        include: { listing: { include: { property: true } } }
      });

      if (!request) throw new NotFoundException('Request not found');
      if (request.listing.property.ownerId !== ownerId) throw new BadRequestException('Unauthorized');

      const updated = await tx.contactRequest.update({
        where: { id: requestId },
        data: {
          status: ContactStatus.APPROVED,
          consentTimestamp: new Date(),
          disclosureTimestamp: new Date()
        }
      });

      await this.audit.log(tx, { actorId: ownerId, action: 'CONTACT_CONSENT_GRANTED', entityType: 'ContactRequest', entityId: request.id, reason });
      return updated;
    });
  }
}
