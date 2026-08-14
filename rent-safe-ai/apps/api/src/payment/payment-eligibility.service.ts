import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { VerificationStatus } from '@prisma/client';

export interface EligibilityInput { tenantId: string; listingId: string; agreementId: string; amount: number; }
export interface EligibilityItem { code: string; passed: boolean; description: string; }
export interface EligibilityResult { eligible: boolean; items: EligibilityItem[]; }

@Injectable()
export class PaymentEligibilityService {
  constructor(private readonly prisma: PrismaService) {}
  async evaluate(input: EligibilityInput, db: any = this.prisma): Promise<EligibilityResult> {
    const listing = await db.listing.findUnique({ where: { id: input.listingId }, include: { property: { include: { verifications: true, owner: true } } } });
    const tenant = await db.user.findUnique({ where: { id: input.tenantId } });
    const agreement = await db.agreement.findUnique({ where: { id: input.agreementId } });
    const owner = listing?.property.owner;
    const bank = owner ? await db.ownerBankAccount.findFirst({ where: { userId: owner.id, isPrimary: true } }) : null;
    const contact = await db.contactRequest.findFirst({ where: { tenantId: input.tenantId, listingId: input.listingId, status: 'APPROVED' } });
    const viewing = await db.viewingRequest.findFirst({ where: { tenantId: input.tenantId, listingId: input.listingId, status: 'COMPLETED' } });
    const exception = await db.paymentEligibilityException.findFirst({ where: { listingId: input.listingId, tenantId: input.tenantId, expiresAt: { gt: new Date() } } });
    const hardHold = owner ? await db.paymentHold.findFirst({ where: { ownerId: owner.id, status: { in: ['PENDING_REVIEW', 'CONVERTED_TO_BLOCK'] } } }) : null;
    const now = new Date();
    const checks: EligibilityItem[] = [
      { code: 'LISTING_PUBLISHED_VERIFIED', passed: Boolean(listing?.lifecycleState === 'PUBLISHED' && listing.property.status === 'ACTIVE' && listing.property.verifications.length > 0 && listing.property.verifications.every((v: any) => v.status === VerificationStatus.VERIFIED && (!v.expiryDate || v.expiryDate > now))), description: 'The listing is published and all required property checks are verified and current.' },
      { code: 'OWNER_CONTACT_VERIFIED', passed: Boolean(owner?.isPhoneVerified && owner?.phone), description: 'The owner has a verified contact method.' },
      { code: 'OWNER_BANK_BENEFICIARY_VERIFIED', passed: Boolean(bank?.status === VerificationStatus.VERIFIED && bank.beneficiaryResult), description: 'The owner’s primary bank beneficiary has been verified.' },
      { code: 'TENANT_PHONE_VERIFIED', passed: Boolean(tenant?.isPhoneVerified && tenant?.phone), description: 'Your phone number is verified.' },
      { code: 'CONTACT_APPROVED', passed: Boolean(contact), description: 'The owner has approved your contact request for this listing.' },
      { code: 'VIEWING_CONFIRMED_OR_EXCEPTION', passed: Boolean(viewing || exception), description: 'A viewing is confirmed by both parties, or an active admin exception exists.' },
      { code: 'AGREEMENT_REFERENCE', passed: Boolean(agreement?.listingId === input.listingId && agreement.tenantId === input.tenantId && agreement.status === 'SIGNED'), description: 'A signed agreement reference is attached to this payment.' },
      { code: 'NO_HARD_FRAUD_HOLD', passed: !hardHold, description: 'No unresolved fraud or safety hold blocks this payment.' },
      { code: 'AMOUNT_WITHIN_LIMITS', passed: Number.isSafeInteger(input.amount) && input.amount >= Number(process.env.PAYMENT_MIN_AMOUNT_PAISE || 100) && input.amount <= Number(process.env.PAYMENT_MAX_AMOUNT_PAISE || 50000000), description: 'The payment amount is a whole number of paise within the configured limits.' },
    ];
    return { eligible: checks.every((item) => item.passed), items: checks };
  }
  async assertEligible(input: EligibilityInput, db: any = this.prisma) {
    const result = await this.evaluate(input, db);
    if (!result.eligible) throw new BadRequestException({ code: 'PAYMENT_NOT_ELIGIBLE', message: 'Payment eligibility checks failed', items: result.items });
    return result;
  }
}
