#!/usr/bin/env bash
set -euo pipefail
mkdir -p backups/postgres
stamp="$(date +%Y%m%d-%H%M%S)"
docker compose -f infra/docker/docker-compose.yml exec -T postgres pg_dump -Fc -d "${POSTGRES_DB:-rentsafe_db}" -U "${POSTGRES_USER:-rentsafe}" > "backups/postgres/rentsafe-${stamp}.dump"
echo "Created backups/postgres/rentsafe-${stamp}.dump"
