# RentSafe operations guide

## PostgreSQL backup and restore

Run `pnpm ops:backup`. Dumps are written to `backups/postgres/` in PostgreSQL custom format. Keep backups outside the repository in shared environments.

Restore only into a clean, separately named database:

```powershell
$env:POSTGRES_DB='rentsafe_db'; $env:POSTGRES_USER='rentsafe'
pnpm ops:restore -- -BackupFile backups/postgres/rentsafe-YYYYMMDD-HHMMSS.dump -TargetDatabase rentsafe_restore_test -ConfirmRestore
```

After restoring, run `prisma migrate status` against the target and verify row counts and a demo login. Never restore over the active database. Take a current backup, stop API workers, restore to a new database, validate, then switch `DATABASE_URL` and restart.

The local recovery test uses `rentsafe_restore_test`; production recovery requires a separate database, credentials, and reviewed cutover.

## MinIO backup

Private originals and derivatives are application data. Use the MinIO client from a host with bucket access:

```text
mc alias set local http://127.0.0.1:9000 "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD"
mc mirror --overwrite local/rentsafe-private ./backups/minio/rentsafe-private
mc mirror --overwrite ./backups/minio/rentsafe-private local/rentsafe-private-restore-test
```

Back up bucket policy/configuration separately. Do not make private originals public. Signed URLs are short-lived and must not be stored in backups or logs.

## Migration rollback policy

Migrations are forward-only in shared environments. Prefer additive migrations, deploy code that supports both schemas, backfill, then remove old fields in a later release. `prisma migrate reset` is allowed only for disposable local databases. For a failed production migration, restore a verified backup into a new instance, validate, cut over, and create a corrective forward migration. Never edit an applied migration.

## Retention

`RETENTION_AUDIT_DAYS` defaults to 2555 days, `RETENTION_OUTBOX_DAYS` to 30 days, and `RETENTION_NOTIFICATION_DAYS` to 730 days. Run `pnpm ops:retention` for a dry-run; add `-- -Apply` only after review. Audit deletion requires legal/privacy approval. Backups use `BACKUP_RETENTION_DAYS` and must be pruned by the host scheduler.

## Failed jobs and notification recovery

Inspect BullMQ failed jobs in Redis/Bull Board, preserve the job payload and error, and retry only after fixing the root cause. Notification outbox rows expose `attempts`, `lastError`, `nextAttemptAt`, and `deadLetteredAt`; replay a dead-lettered event only after confirming deduplication keys and provider health. Never manually mark a failed payment or webhook successful.

## Incident runbooks

### Fraud incident

1. Assign the report and preserve evidence identifiers.
2. Put the owner/payment in a hold without disclosing reporter identity.
3. Suspend affected listings when the hard-block policy is met.
4. Notify the owner generically and audit every decision.
5. Resolve or dismiss with a written reason and release/convert the hold.

### Compromised account

1. Revoke all refresh-token sessions and suspend the account.
2. Freeze payment activity and active listings.
3. Preserve audit logs, access timestamps, device references, and provider events.
4. Confirm identity through approved recovery before reinstatement.
5. Rotate affected secrets after identifying blast radius.

### Payment webhook outage

1. Confirm provider status and stop duplicate manual reconciliation.
2. Keep orders in their last trusted state; never infer capture from client responses.
3. Replay signed provider events using unique event IDs after recovery.
4. Verify duplicate events return the idempotent replay result.
5. Reconcile provider and local transaction timelines before releasing holds.

### Reviewer escalation

Escalate unresolved high/critical signals, identity mismatches, payment disputes, and repeated duplicate reports to an admin. Require an audit reason for overrides and use the safety hold path when payment integrity is uncertain.

## Health, metrics, and logging

`GET /api/v1/health` is the liveness/readiness endpoint. Monitor PostgreSQL, Redis, MinIO, queue depth, failed/dead-lettered jobs, outbox age, webhook rejection rate, payment reconciliation lag, and API 4xx/5xx rates. Logs may include request/correlation ID, actor ID, event/job ID, duration, and outcome—never OTPs, access tokens, raw identity/bank values, signed URLs, or provider secrets.

## Data export and deletion

Users request export/deletion through `/api/v1/privacy/export` and `/api/v1/privacy/delete`. Export workers must redact secrets and provider payloads; deletion preserves legally required audit/payment records while removing or anonymizing personal data. Verify ownership and record completion in the audit trail.
