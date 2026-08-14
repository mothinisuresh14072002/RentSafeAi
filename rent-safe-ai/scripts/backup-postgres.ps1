param(
  [string]$ComposeFile = "infra/docker/docker-compose.yml",
  [string]$OutputDirectory = "backups/postgres"
)

$ErrorActionPreference = 'Stop'
$db = if ($env:POSTGRES_DB) { $env:POSTGRES_DB } else { 'rentsafe_db' }
$user = if ($env:POSTGRES_USER) { $env:POSTGRES_USER } else { 'rentsafe' }
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$out = Join-Path $root $OutputDirectory
New-Item -ItemType Directory -Force -Path $out | Out-Null
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$file = Join-Path $out "rentsafe-$stamp.dump"
$compose = Join-Path $root $ComposeFile
$container = (docker compose -f $compose ps -q postgres).Trim()
if (-not $container) { throw "Postgres container is not running" }
$remote = "/tmp/rentsafe-backup-$stamp.dump"
docker compose -f $compose exec -T postgres sh -c "pg_dump -Fc -d '$db' -U '$user' > '$remote'"
docker cp "${container}:$remote" $file
docker compose -f $compose exec -T postgres rm -f $remote | Out-Null
if ($LASTEXITCODE -ne 0) { throw "pg_dump failed" }
Write-Output "Created $file"
