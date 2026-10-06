# Contributing to RentSafe AI

Thanks for helping improve safer rental verification.

## Before you start

RentSafe AI treats AI as an assistive fraud/risk signal. Do not implement flows that present AI output, uploaded documents, or reviewer discretion as legal proof of ownership. Authoritative ownership checks must remain non-overridable.

## Local setup

From the repository root:

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

For a Docker-only LAN demo:

- Windows: `rent-safe-ai\start-lan.bat`
- Linux/macOS: `cd rent-safe-ai && ./start-lan.sh`

## Quality gate

Before opening a pull request:

```bash
cd rent-safe-ai
pnpm --filter api prisma:generate
pnpm --filter api prisma:validate
pnpm lint
pnpm typecheck
pnpm build
pnpm test
```

If you change `prisma/schema.prisma`, include a migration in `apps/api/prisma/migrations`.

## Pull requests

Keep changes focused, explain the user problem, include tests for behavior changes, and call out security/privacy impact. Never commit real KYC data, title documents, credentials, OTPs, access tokens, private registry data, or production environment files.

## Good contribution areas

- jurisdiction-specific registry adapters behind the existing provider interface;
- accessibility and responsive UX;
- anti-fraud rules with explainable evidence;
- test coverage and fixture quality;
- deployment, monitoring, backup/restore, and operational docs;
- translations and India-localized rental terminology.
