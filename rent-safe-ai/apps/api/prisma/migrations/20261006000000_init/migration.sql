-- Baseline migration generated from prisma/schema.prisma.
-- Review and test this migration before connecting RentSafe AI to real production data.

CREATE TYPE "Role" AS ENUM ('TENANT', 'OWNER', 'REVIEWER', 'ADMIN');
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'PENDING_DELETION');
CREATE TYPE "SessionStatus" AS ENUM ('ACTIVE', 'REVOKED', 'EXPIRED');
CREATE TYPE "PropertyStatus" AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE "PublishStatus" AS ENUM ('DRAFT', 'OWNER_KYC_PENDING', 'PROPERTY_EVIDENCE_PENDING', 'UNDER_REVIEW', 'VERIFIED', 'PUBLISHED', 'CHANGES_REQUESTED', 'REJECTED', 'SUSPENDED', 'EXPIRED', 'RENTED', 'ARCHIVED');
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'NEEDS_REVIEW', 'VERIFIED', 'REJECTED', 'EXPIRED');
CREATE TYPE "ReviewState" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CHANGES_REQUESTED', 'SUSPENDED', 'EXPIRED');
CREATE TYPE "DocumentType" AS ENUM ('TITLE_EXTRACT', 'PROPERTY_TAX', 'OTHER_EVIDENCE');
CREATE TYPE "ContactStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE "ViewingStatus" AS ENUM ('PROPOSED', 'ACCEPTED', 'RESCHEDULED', 'CANCELLED', 'COMPLETED', 'DISPUTED');
CREATE TYPE "AgreementStatus" AS ENUM ('DRAFT', 'UPLOADED', 'SIGNED', 'REJECTED', 'EXPIRED');
CREATE TYPE "PaymentStatus" AS ENUM ('CREATED', 'AUTHORIZED', 'CAPTURED', 'FAILED', 'REFUND_PENDING', 'REFUNDED', 'DISPUTED');
CREATE TYPE "RefundStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');
CREATE TYPE "ReportStatus" AS ENUM ('OPEN', 'INVESTIGATING', 'RESOLVED', 'DISMISSED');
CREATE TYPE "PaymentHoldStatus" AS ENUM ('PENDING_REVIEW', 'RELEASED', 'CONVERTED_TO_BLOCK');
CREATE TYPE "SignalSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE "SignalStatus" AS ENUM ('ACTIVE', 'RESOLVED');
CREATE TYPE "PrivacyRequestType" AS ENUM ('EXPORT', 'DELETION');
CREATE TYPE "OwnerState" AS ENUM ('PROFILE_PENDING', 'KYC_PENDING', 'KYC_REVIEW', 'VERIFIED', 'CHANGES_REQUESTED', 'REJECTED', 'SUSPENDED', 'EXPIRED');
CREATE TYPE "PrivacyRequestStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'REJECTED');
CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'EMAIL', 'SMS', 'PUSH');
CREATE TYPE "NotificationDeliveryStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'SKIPPED');
CREATE TYPE "PropertyType" AS ENUM ('APARTMENT', 'INDEPENDENT_HOUSE', 'VILLA', 'BUILDER_FLOOR');
CREATE TYPE "QuarantineStatus" AS ENUM ('PENDING_SCAN', 'CLEARED', 'INFECTED');

CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'TENANT',
    "email" TEXT NOT NULL,
    "hashedPassword" TEXT NOT NULL,
    "phone" TEXT,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "isEmailVerified" BOOLEAN NOT NULL DEFAULT false,
    "isPhoneVerified" BOOLEAN NOT NULL DEFAULT false,
    "locale" TEXT NOT NULL DEFAULT 'en-IN',
    "deviceFingerprints" JSONB DEFAULT '[]'::jsonb,
    "flaggedForFraud" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "refreshTokenHash" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "deviceId" TEXT,
    "status" "SessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "otp_attempts" (
    "id" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "codeHash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "otp_attempts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "user_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "displayName" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "avatarUrl" TEXT,
    "ownerState" "OwnerState" NOT NULL DEFAULT 'PROFILE_PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "owner_kyc_cases" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerReference" TEXT NOT NULL,
    "status" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "maskedResult" JSONB,
    "normalizedName" TEXT,
    "reviewerDecision" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "owner_kyc_cases_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "owner_bank_accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "encryptedToken" TEXT NOT NULL,
    "providerReference" TEXT,
    "maskedAccount" TEXT NOT NULL,
    "beneficiaryResult" TEXT,
    "status" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "reviewerDecision" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "owner_bank_accounts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "properties" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "propertyType" "PropertyType" NOT NULL,
    "structuredAddress" JSONB NOT NULL,
    "chennaiLocality" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "normalizedAddressHash" TEXT NOT NULL,
    "status" "PropertyStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "properties_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "property_identifiers" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "identifierType" TEXT NOT NULL,
    "encryptedValue" TEXT NOT NULL,
    "normalizedHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "property_identifiers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "property_documents" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "documentType" "DocumentType" NOT NULL,
    "objectKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL DEFAULT 'application/pdf',
    "checksum" TEXT NOT NULL,
    "quarantineStatus" "QuarantineStatus" NOT NULL DEFAULT 'PENDING_SCAN',
    "extractedFields" JSONB,
    "reviewState" "ReviewState" NOT NULL DEFAULT 'PENDING',
    "expiryDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "property_documents_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "property_verifications" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "checkType" TEXT NOT NULL,
    "status" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "evidenceReference" TEXT,
    "reviewerId" TEXT,
    "completedAt" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "property_verifications_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "presence_challenges" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "phrase" TEXT NOT NULL,
    "status" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "submittedLat" DOUBLE PRECISION,
    "submittedLng" DOUBLE PRECISION,
    "mediaKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "presence_challenges_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "listings" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "rentAmount" INTEGER NOT NULL,
    "depositAmount" INTEGER NOT NULL,
    "furnishing" TEXT NOT NULL,
    "bedroomCount" INTEGER NOT NULL DEFAULT 1,
    "amenities" JSONB NOT NULL DEFAULT '[]'::jsonb,
    "availability" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "mediaOrder" JSONB NOT NULL DEFAULT '[]'::jsonb,
    "lifecycleState" "PublishStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedVersion" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "listings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "listing_media" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "privateOriginalKey" TEXT NOT NULL,
    "publicDerivativeKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL DEFAULT 'image/jpeg',
    "sha256Hash" TEXT NOT NULL,
    "pHash" TEXT NOT NULL,
    "quarantineStatus" "QuarantineStatus" NOT NULL DEFAULT 'PENDING_SCAN',
    "challengeMetadata" JSONB,
    "reviewState" "ReviewState" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "listing_media_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "listing_versions" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "snapshotData" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "listing_versions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "contact_requests" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "status" "ContactStatus" NOT NULL DEFAULT 'PENDING',
    "consentTimestamp" TIMESTAMP(3),
    "disclosureTimestamp" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "contact_requests_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "viewing_requests" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "schedule" TIMESTAMP(3) NOT NULL,
    "status" "ViewingStatus" NOT NULL DEFAULT 'PROPOSED',
    "tenantConfirmedAt" TIMESTAMP(3),
    "ownerConfirmedAt" TIMESTAMP(3),
    "disagreementState" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "viewing_requests_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "agreements" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "documentKey" TEXT NOT NULL,
    "status" "AgreementStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "agreements_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "payment_orders" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "agreementId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" "PaymentStatus" NOT NULL DEFAULT 'CREATED',
    "idempotencyKey" TEXT NOT NULL,
    "providerOrderId" TEXT,
    "eligibilitySnapshot" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "payment_orders_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "payment_transactions" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "providerReference" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "payment_transactions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "payment_webhook_events" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "payment_webhook_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "refunds" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" "RefundStatus" NOT NULL DEFAULT 'PENDING',
    "providerReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "refunds_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "fraud_reports" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "subjectType" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "narrative" TEXT NOT NULL,
    "evidence" JSONB,
    "severity" "SignalSeverity" NOT NULL DEFAULT 'MEDIUM',
    "status" "ReportStatus" NOT NULL DEFAULT 'OPEN',
    "assignedToId" TEXT,
    "resolution" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "ownerNotifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "fraud_reports_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "payment_eligibility_exceptions" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "approvedBy" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "payment_eligibility_exceptions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "payment_holds" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "paymentOrderId" TEXT,
    "reason" TEXT NOT NULL,
    "status" "PaymentHoldStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "releasedAt" TIMESTAMP(3),
    "releasedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "payment_holds_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "risk_signals" (
    "id" TEXT NOT NULL,
    "ruleCode" TEXT NOT NULL,
    "severity" "SignalSeverity" NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "evidenceJson" JSONB NOT NULL,
    "status" "SignalStatus" NOT NULL DEFAULT 'ACTIVE',
    "reviewerResolution" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "risk_signals_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "review_cases" (
    "id" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "status" "ReviewState" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "review_cases_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "review_actions" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "actionTaken" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "review_actions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "consents" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "policyVersion" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "withdrawalTimestamp" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "consents_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "beforeHash" TEXT,
    "afterHash" TEXT,
    "requestId" TEXT,
    "ipDeviceReference" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "outbox_events" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "processedAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastError" TEXT,
    "lockedAt" TIMESTAMP(3),
    "deadLetteredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "eventType" TEXT,
    "deduplicationKey" TEXT,
    "channel" "NotificationChannel" NOT NULL DEFAULT 'IN_APP',
    "deliveryStatus" "NotificationDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "deliveredAt" TIMESTAMP(3),
    "lastError" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "notification_preferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "smsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "pushEnabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "privacy_requests" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "PrivacyRequestType" NOT NULL,
    "status" "PrivacyRequestStatus" NOT NULL DEFAULT 'PENDING',
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "privacy_requests_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");
CREATE INDEX "users_email_idx" ON "users"("email");
CREATE INDEX "users_phone_idx" ON "users"("phone");
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");
CREATE INDEX "sessions_status_idx" ON "sessions"("status");
CREATE INDEX "sessions_familyId_idx" ON "sessions"("familyId");
CREATE INDEX "otp_attempts_phone_idx" ON "otp_attempts"("phone");
CREATE INDEX "otp_attempts_email_idx" ON "otp_attempts"("email");
CREATE UNIQUE INDEX "user_profiles_userId_key" ON "user_profiles"("userId");
CREATE UNIQUE INDEX "owner_kyc_cases_providerReference_key" ON "owner_kyc_cases"("providerReference");
CREATE UNIQUE INDEX "properties_normalizedAddressHash_key" ON "properties"("normalizedAddressHash");
CREATE UNIQUE INDEX "payment_orders_idempotencyKey_key" ON "payment_orders"("idempotencyKey");
CREATE UNIQUE INDEX "payment_orders_providerOrderId_key" ON "payment_orders"("providerOrderId");
CREATE UNIQUE INDEX "payment_webhook_events_eventId_key" ON "payment_webhook_events"("eventId");
CREATE INDEX "payment_eligibility_exceptions_listingId_tenantId_expiresAt_idx" ON "payment_eligibility_exceptions"("listingId", "tenantId", "expiresAt");
CREATE INDEX "payment_holds_ownerId_status_idx" ON "payment_holds"("ownerId", "status");
CREATE INDEX "payment_holds_reportId_idx" ON "payment_holds"("reportId");
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");
CREATE INDEX "audit_logs_actorId_idx" ON "audit_logs"("actorId");
CREATE INDEX "outbox_events_processedAt_nextAttemptAt_idx" ON "outbox_events"("processedAt", "nextAttemptAt");
CREATE INDEX "outbox_events_deadLetteredAt_idx" ON "outbox_events"("deadLetteredAt");
CREATE UNIQUE INDEX "notifications_userId_deduplicationKey_key" ON "notifications"("userId", "deduplicationKey");
CREATE UNIQUE INDEX "notification_preferences_userId_key" ON "notification_preferences"("userId");

ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "owner_kyc_cases" ADD CONSTRAINT "owner_kyc_cases_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "owner_bank_accounts" ADD CONSTRAINT "owner_bank_accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "property_identifiers" ADD CONSTRAINT "property_identifiers_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "property_documents" ADD CONSTRAINT "property_documents_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "property_verifications" ADD CONSTRAINT "property_verifications_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "presence_challenges" ADD CONSTRAINT "presence_challenges_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "listings" ADD CONSTRAINT "listings_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "listing_media" ADD CONSTRAINT "listing_media_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "listings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "listing_versions" ADD CONSTRAINT "listing_versions_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "listings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "contact_requests" ADD CONSTRAINT "contact_requests_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "contact_requests" ADD CONSTRAINT "contact_requests_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "listings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "viewing_requests" ADD CONSTRAINT "viewing_requests_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "viewing_requests" ADD CONSTRAINT "viewing_requests_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "listings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "agreements" ADD CONSTRAINT "agreements_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "listings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payment_orders" ADD CONSTRAINT "payment_orders_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "listings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payment_orders" ADD CONSTRAINT "payment_orders_agreementId_fkey" FOREIGN KEY ("agreementId") REFERENCES "agreements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "payment_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payment_webhook_events" ADD CONSTRAINT "payment_webhook_events_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "payment_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "payment_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payment_eligibility_exceptions" ADD CONSTRAINT "payment_eligibility_exceptions_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "listings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payment_holds" ADD CONSTRAINT "payment_holds_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "fraud_reports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payment_holds" ADD CONSTRAINT "payment_holds_paymentOrderId_fkey" FOREIGN KEY ("paymentOrderId") REFERENCES "payment_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "review_actions" ADD CONSTRAINT "review_actions_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "review_cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "consents" ADD CONSTRAINT "consents_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "privacy_requests" ADD CONSTRAINT "privacy_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
