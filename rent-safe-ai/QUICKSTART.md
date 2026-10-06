# RentSafe AI — Quick Start

RentSafe AI supports two local workflows:

1. **Docker-only LAN demo** — easiest for trying the full stack.
2. **Source development** — best when changing API/web code.

## Option A — Docker-only LAN demo

### Requirements

- Git
- Docker Desktop (Windows/macOS) or Docker Engine + Compose (Linux)

### Windows

```bat
git clone https://github.com/mothinisuresh14072002/RentSafeAi.git
cd RentSafeAi\rent-safe-ai
start-lan.bat
```

### Linux / macOS

```bash
git clone https://github.com/mothinisuresh14072002/RentSafeAi.git
cd RentSafeAi/rent-safe-ai
chmod +x start-lan.sh
./start-lan.sh
```

Open:

- App: http://localhost
- API liveness: http://localhost/api/v1/health/live
- API readiness: http://localhost/api/v1/health/ready

Check services:

```bash
docker compose -f infra/docker/docker-compose.lan.yml ps
```

Follow logs:

```bash
docker compose -f infra/docker/docker-compose.lan.yml logs -f api web nginx
```

Stop:

```bash
docker compose -f infra/docker/docker-compose.lan.yml down
```

Reset all LAN data:

```bash
docker compose -f infra/docker/docker-compose.lan.yml down -v
```

The LAN defaults are intentionally local-only. Do not expose them to the Internet.

## Option B — Source development

### Requirements

- Node.js 22+
- pnpm 9+
- Docker
- Git

From the repository:

```bash
cd rent-safe-ai
cp .env.example .env
pnpm install
docker compose up -d
pnpm --filter api prisma:generate
pnpm --filter api exec prisma migrate deploy
pnpm db:seed
pnpm dev
```

On Windows PowerShell, use:

```powershell
Copy-Item .env.example .env
```

Default development URLs:

- Web: http://localhost:3000
- API: http://localhost:3001/api/v1
- Swagger (development): http://localhost:3001/api/docs
- pgAdmin: http://localhost:5050
- Mailpit: http://localhost:8025
- MinIO console: http://localhost:9001

## Quality checks

Before pushing code:

```bash
pnpm --filter api prisma:generate
pnpm --filter api prisma:validate
pnpm lint
pnpm typecheck
pnpm build
pnpm test
```

If `prisma/schema.prisma` changes, add a migration under `apps/api/prisma/migrations`.

## Production

Use the immutable container images published by GitHub Actions only after CI succeeds.

```bash
cp .env.production.example .env.production
# replace every CHANGE_ME value

docker compose -f infra/docker/docker-compose.production.yml \
  --env-file .env.production pull

docker compose -f infra/docker/docker-compose.production.yml \
  --env-file .env.production up -d
```

For a specific release commit:

```bash
export IMAGE_TAG=<git-commit-sha>
docker compose -f infra/docker/docker-compose.production.yml \
  --env-file .env.production up -d
```

See `docs/DEPLOYMENT.md` and `docs/release-checklist.md` before serving real users.

## Important trust boundary

The repository includes sandbox/local providers for development. A real deployment must replace sandbox ownership registry, KYC, payment, malware scanning, and related integrations with legally permitted production providers. AI output must never be represented as legal proof of property ownership.
