#!/usr/bin/env bash
set -euo pipefail
backup="${1:?usage: restore-postgres.sh BACKUP_FILE TARGET_DATABASE CONFIRM_RESTORE}"
target="${2:?usage: restore-postgres.sh BACKUP_FILE TARGET_DATABASE CONFIRM_RESTORE}"
confirm="${3:-}"
[[ "$confirm" == "CONFIRM_RESTORE" ]] || { echo "Refusing restore without CONFIRM_RESTORE" >&2; exit 2; }
[[ "$target" != "${POSTGRES_DB:-rentsafe_db}" ]] || { echo "Use a clean target database" >&2; exit 2; }
docker compose -f infra/docker/docker-compose.yml exec -T postgres psql -U "$POSTGRES_USER" -d postgres -c "CREATE DATABASE \"$target\"" || true
docker compose -f infra/docker/docker-compose.yml exec -T postgres pg_restore --clean --if-exists --no-owner -U "$POSTGRES_USER" -d "$target" < "$backup"
