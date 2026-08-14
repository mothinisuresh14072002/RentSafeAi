param(
  [string]$ComposeFile = "infra/docker/docker-compose.yml",
  [switch]$Apply
)

$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$compose = Join-Path $root $ComposeFile
$auditDays = if ($env:RETENTION_AUDIT_DAYS) { $env:RETENTION_AUDIT_DAYS } else { 2555 }
$outboxDays = if ($env:RETENTION_OUTBOX_DAYS) { $env:RETENTION_OUTBOX_DAYS } else { 30 }
$notificationDays = if ($env:RETENTION_NOTIFICATION_DAYS) { $env:RETENTION_NOTIFICATION_DAYS } else { 730 }
$sql = @"
SELECT 'audit_logs', count(*) FROM audit_logs WHERE "createdAt" < now() - interval '$auditDays days';
SELECT 'outbox_events', count(*) FROM outbox_events WHERE "processedAt" IS NOT NULL AND "createdAt" < now() - interval '$outboxDays days';
SELECT 'notifications', count(*) FROM notifications WHERE "createdAt" < now() - interval '$notificationDays days';
"@
if ($Apply) {
  $sql += @"
DELETE FROM outbox_events WHERE "processedAt" IS NOT NULL AND "createdAt" < now() - interval '$outboxDays days';
DELETE FROM notifications WHERE "createdAt" < now() - interval '$notificationDays days';
-- Audit logs are retained by default; delete only under an approved legal-retention policy.
"@
}
$sql | docker compose -f $compose exec -T postgres psql -U $env:POSTGRES_USER -d $env:POSTGRES_DB
if ($LASTEXITCODE -ne 0) { throw "Retention command failed" }
