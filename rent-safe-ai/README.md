# RentSafe Chennai

A local-first residential rental marketplace designed to reduce advance-payment scams through rigorous identity verification, escrow-style sandbox payments, and transparent fraud signals.

## Architecture
- **Monorepo**: pnpm workspaces + Turborepo
- **API**: Node.js 22, NestJS, Prisma, PostgreSQL
- **Worker**: BullMQ + Redis

## Demo environment

From `rent-safe-ai`, run `pnpm db:seed` after applying the Prisma schema. The seed is deterministic and uses upserts, so it is safe to rerun.

Demo accounts use fictional data:

- `demo.tenant@rentsafe.test` / `RentSafeDemo!2026`
- `demo.owner@rentsafe.test` / `RentSafeDemo!2026`
- `demo.reviewer@rentsafe.test` / `RentSafeDemo!2026`
- `demo.admin@rentsafe.test` / `RentSafeDemo!2026`

For phone OTP login, use the seeded demo phone numbers `+919900000001` through `+919900000004`. In local mode, `LocalOtpProvider` logs the generated OTP. No real personal data is used.
- **Owner/Admin Web**: Next.js App Router
- **Tenant Mobile**: React Native + Expo

## Local Infrastructure
Run from the repository root:

- **Start**: `docker compose up -d`
- **Stop**: `docker compose down`
- **Reset Data**: `docker compose down -v`
- **Logs**: `docker compose logs -f`

Service URLs:

- API: [http://localhost:3000/api/v1](http://localhost:3000/api/v1)
- API liveness: [http://localhost:3000/api/v1/health/live](http://localhost:3000/api/v1/health/live)
- Web: [http://localhost:3001](http://localhost:3001) when started with `pnpm --filter web dev -- -p 3001`
- MinIO API: [http://localhost:9000](http://localhost:9000); console: [http://localhost:9001](http://localhost:9001)
- Mailpit: [http://localhost:8025](http://localhost:8025); SMTP `localhost:1025`

### pgAdmin Access
- **URL**: [http://localhost:5050](http://localhost:5050)
- **Email**: admin@rentsafe.local
- **Password**: admin
- **Server Name**: local-postgres
- **Host**: postgres
- **Port**: 5432
- **Username**: rentsafe
- **Password**: local_dev_password

## Local Development
1. Copy `.env.example` to `.env`
2. Run `pnpm install`
3. Run `docker compose up -d`
4. Run `pnpm db:migrate`
5. Run `pnpm db:seed`
6. Run `pnpm dev`

For Android Emulator, point the mobile API client at `http://10.0.2.2:3000/api/v1`; a physical device uses the host machine's LAN IP. Start Expo with `pnpm --filter mobile start` and press `a` for the Android emulator.

To reset local data, run `docker compose down -v`, remove `backups/` if desired, then repeat the migration and seed commands. This destroys local PostgreSQL, Redis, and MinIO volumes.

The sandbox uses deterministic providers only: OTP is printed by `LocalOtpProvider`, KYC/payment/bank/geocoding are simulated, Mailpit captures email locally, and no real payment or identity provider is contacted. See [docs/operations.md](docs/operations.md) for backup, restore, retention, incident, and recovery procedures.
