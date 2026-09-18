# RentSafe AI production deployment

The repository includes containerized production configuration for the web app, API, PostgreSQL, Redis, MinIO and Nginx. Real production integrations still require approved credentials and providers.

## Production topology

Internet -> Nginx -> Next.js web
                 -> NestJS API -> PostgreSQL
                              -> Redis
                              -> MinIO

Only Nginx publishes a host port. PostgreSQL, Redis and MinIO remain on the private Docker network.

## Build and publish

GitHub Actions publishes:
- ghcr.io/mothinisuresh14072002/rentsafeai-api
- ghcr.io/mothinisuresh14072002/rentsafeai-web

The workflow is at .github/workflows/container-release.yml. Each push to main produces both latest and commit-SHA image tags.

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

Start the current release:

    docker compose -f infra/docker/docker-compose.production.yml --env-file .env.production pull
    docker compose -f infra/docker/docker-compose.production.yml --env-file .env.production up -d
    docker compose -f infra/docker/docker-compose.production.yml --env-file .env.production ps

To deploy one immutable GitHub commit instead of latest:

    export IMAGE_TAG=COMMIT_SHA
    docker compose -f infra/docker/docker-compose.production.yml --env-file .env.production pull
    docker compose -f infra/docker/docker-compose.production.yml --env-file .env.production up -d

The API container runs Prisma migrations before starting NestJS. The production compose file also initializes the private MinIO bucket before the API starts.

## Health checks

From the server:

    curl http://127.0.0.1/api/v1/health/live
    curl http://127.0.0.1/api/v1/health/ready

## Domain and HTTPS

Point a DNS A record such as app.example.com to the server. Put TLS in front of Nginx using Certbot or a managed reverse proxy, then redirect HTTP to HTTPS.

The application is designed so the public web and API share the same origin. Set CORS_ORIGIN to the final HTTPS origin.

## LAN testing

For local/LAN testing, use infra/docker/docker-compose.lan.yml and the supplied startup scripts:

- Windows: start-lan.bat
- Linux: start-lan.sh

Do not expose PostgreSQL, Redis or MinIO directly to the LAN unless the deployment has been deliberately configured for it.

## Before real users

1. Replace SandboxPropertyRegistryProvider with a legally permitted authoritative registry integration.
2. Configure real KYC and OTP/email providers.
3. Configure real payment processing and signed webhooks.
4. Configure malware scanning.
5. Configure private production object storage and verify browser upload/download URLs.
6. Configure monitoring, alerting, WAF/rate limits and off-server encrypted backups.
7. Review privacy, retention, consent and rental-law requirements.
8. Run security, load and backup-restore tests.

Do not present the sandbox registry as legal ownership verification.

## Rollout checklist

Test registration, login/OTP, KYC, property claims, ownership verification, document uploads, listing gates, tenant search, contact/viewing requests, agreements, payments, privacy requests and reviewer controls.

Promote the same immutable image tag from staging to production after testing.
