# RentSafe local MVP release checklist

## Clean checkout

- [ ] `pnpm install`
- [ ] `docker compose up -d`
- [ ] `pnpm db:migrate`
- [ ] `pnpm db:seed`
- [ ] `pnpm lint`
- [ ] `pnpm typecheck`
- [ ] `pnpm test`
- [ ] `pnpm build`

## Core journey

- [ ] Tenant/owner/reviewer/admin demo accounts are available.
- [ ] Owner OTP and sandbox KYC complete.
- [ ] Property registration and private evidence upload complete.
- [ ] Reviewer sees explainable duplicate/risk evidence.
- [ ] Verified owner publishes listing.
- [ ] Tenant searches, sees verification badges, requests contact, confirms viewing, and reaches signed agreement.
- [ ] Eligible sandbox payment order is created and signed webhook capture is idempotent.

## Blocked and fraud paths

- [ ] Unverified owner cannot submit or publish.
- [ ] Missing mandatory checks prevent approval.
- [ ] Duplicate address/identifier/document/image creates signals.
- [ ] Similar image warns without automatic conviction.
- [ ] Payment is blocked before contact/viewing/agreement.
- [ ] Critical changes, suspension, expiry, and fraud holds block payment.
- [ ] Forged webhook, replay, IDOR, raw identity/bank access, and tenant-to-admin access tests pass.
- [ ] Sensitive admin actions have audit records.

## Operations

- [ ] `pnpm ops:backup` creates a PostgreSQL dump.
- [ ] Dump restores into `rentsafe_restore_test` and row counts/demo login are verified.
- [ ] MinIO mirror/restore notes are reviewed.
- [ ] Failed-job, fraud, compromised-account, and webhook-outage runbooks are available.
- [ ] Mailpit, pgAdmin, MinIO console, API liveness, and logs are reachable.

## Production integrations still required

- Real OTP/SMS and email delivery adapters.
- Production KYC, bank, payment, malware scanning, object storage, secrets management, and monitoring.
- Reviewed legal retention/deletion policy, WAF/rate limiting, HA PostgreSQL/Redis, encrypted off-site backups, and disaster-recovery exercises.
