# RentSafe AI production deployment

The repository now includes containerized production configuration. Real production integrations still require approved credentials and providers.

## Production topology

Internet -> Nginx -> Next.js web
                 -> NestJS API -> PostgreSQL
                              -> Redis
                              -> MinIO

## Build and publish

GitHub Actions publishes:
- ghcr.io/mothinisuresh14072002/rentsafeai-api
- ghcr.io/mothinisuresh14072002/rentsafeai-web

The workflow is at .github/workflows/container-release.yml.

## Server

Recommended: Ubuntu 22.04/24.04 with Docker Engine and Docker Compose.

Clone the repository:

    git clone https://github.com/mothinisuresh14072002/RentSafeAi.git
    cd RentSafeAi/rent-safe-ai

Create production environment:

    cp .env.production.example .env.production
    nano .env.production

Replace every CHANGE_ME value. Never commit .env.production.

Login to GHCR with a token that can read packages:

    echo "$GITHUB_TOKEN" | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin

Start:

    docker compose -f infra/docker/docker-compose.production.yml --env-file .env.production pull
    docker compose -f infra/docker/docker-compose.production.yml --env-file .env.production up -d
    docker compose -f infra/docker/docker-compose.production.yml --env-file .env.production ps

Health checks:

    curl http://127.0.0.1/api/v1/health/live
    curl http://127.0.0.1/api/v1/health/ready

The API container runs Prisma migrations before starting NestJS.

## Domain and HTTPS

Point a DNS A record such as app.example.com to the server. Put TLS in front of Nginx using Certbot or a managed reverse proxy, then redirect HTTP to HTTPS.

## Before real users

1. Replace SandboxPropertyRegistryProvider with a legally permitted authoritative registry integration.
2. Configure real KYC and OTP/email providers.
3. Configure real payment processing and signed webhooks.
4. Configure malware scanning.
5. Configure private production object storage.
6. Configure monitoring, alerting, WAF/rate limits and off-server encrypted backups.
7. Review privacy, retention, consent and rental-law requirements.
8. Run security, load and backup-restore tests.

Do not present the sandbox registry as legal ownership verification.

## Rollout

Use a staging domain first. Test registration, KYC, property verification, listing gates, tenant search/contact/viewing, agreements, payments, privacy flows and reviewer controls. Promote the same tested image tags to production.
