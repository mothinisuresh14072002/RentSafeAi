# RentSafe threat model and security controls

## Assets

- Identity and bank verification data: confidential; available only to the owning user in redacted form and authorized reviewers.
- Private originals and property documents: confidential; access is ownership/role checked and URLs expire.
- Payments, holds, and review decisions: integrity-critical; state transitions, idempotency keys, signatures, and audit records protect them.
- Public listing derivatives: public, but never used to expose private originals.

## Trust boundaries

1. Browser/mobile client → API: JWT authentication, role checks, DTO whitelisting, rate limits, and ownership policies.
2. API → PostgreSQL: Prisma parameterized queries and transaction boundaries.
3. API → Redis workers: BullMQ retry/backoff; job payloads contain identifiers, not secrets.
4. API → object storage: presigned URLs, property-scoped object keys, MIME/size allowlists, quarantine before access.
5. Provider → API: HMAC-signed, replay-resistant webhook records.

## High-risk abuse cases and mitigations

| Threat | Control |
| --- | --- |
| IDOR/BOLA | `Policies`, participant checks, role guards, and notification self-access checks |
| Webhook spoof/replay | HMAC verification and unique provider event IDs |
| Payment race/replay | Prisma transactions and idempotency keys |
| File polyglot/MIME spoof | extension/MIME/size allowlists, quarantine, malware signature callback |
| Token leakage/replay | short-lived access tokens, refresh rotation, family revocation, no token logging |
| Admin escalation | explicit reviewer/admin route roles and mandatory audit reasons for sensitive actions |
| Excessive exposure | redacted bank responses and agreement state-only responses |
| SSRF | no server-side fetch of user-controlled URLs; provider endpoints are configured services |
| Brute force | OTP throttles, attempt limits, expiry, and cooldown |

Residual risks requiring production infrastructure review: antivirus sandbox quality, object-store bucket policy, WAF/rate-limit distribution, dependency advisories, and mobile certificate pinning.
