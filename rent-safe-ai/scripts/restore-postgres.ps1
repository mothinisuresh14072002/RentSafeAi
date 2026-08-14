param(
  [Parameter(Mandatory=$true)][string]$BackupFile,
  [Parameter(Mandatory=$true)][string]$TargetDatabase,
  [string]$ComposeFile = "infra/docker/docker-compose.yml",
  [switch]$ConfirmRestore
)

$ErrorActionPreference = 'Stop'
$db = if ($env:POSTGRES_DB) { $env:POSTGRES_DB } else { 'rentsafe_db' }
$user = if ($env:POSTGRES_USER) { $env:POSTGRES_USER } else { 'rentsafe' }
if (-not $ConfirmRestore) { throw "Restore is destructive to the target database. Re-run with -ConfirmRestore." }
if ($TargetDatabase -eq $db) { throw "Refusing to restore over the source database; use a clean target database." }
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$backup = (Resolve-Path $BackupFile).Path
$compose = Join-Path $root $ComposeFile
docker compose -f $compose exec -T postgres psql -U $user -d postgres -c "CREATE DATABASE `"$TargetDatabase`"" 2>$null
$container = (docker compose -f $compose ps -q postgres).Trim()
if (-not $container) { throw "Postgres container is not running" }
$remote = "/tmp/rentsafe-restore-$([guid]::NewGuid().ToString('N')).dump"
docker cp $backup "${container}:$remote"
docker compose -f $compose exec -T postgres pg_restore --clean --if-exists --no-owner -U $user -d $TargetDatabase $remote
docker compose -f $compose exec -T postgres rm -f $remote | Out-Null
if ($LASTEXITCODE -ne 0) { throw "pg_restore failed" }
Write-Output "Restored $backup into $TargetDatabase"
