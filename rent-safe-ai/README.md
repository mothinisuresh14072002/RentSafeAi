# RentSafe Chennai

A local-first residential rental marketplace designed to reduce advance-payment scams through rigorous identity verification, escrow-style sandbox payments, and transparent fraud signals.

## Architecture
- **Monorepo**: pnpm workspaces + Turborepo
- **API**: Node.js 22, NestJS, Prisma, PostgreSQL
- **Worker**: BullMQ + Redis
- **Owner/Admin Web**: Next.js App Router
- **Tenant Mobile**: React Native + Expo

## Local Infrastructure
Run the following commands in the `infra/docker/` directory:

- **Start**: `docker compose up -d`
- **Stop**: `docker compose down`
- **Reset Data**: `docker compose down -v`
- **Logs**: `docker compose logs -f`

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
2. Run `docker compose up -d` in `infra/docker/`
3. Run `pnpm install`
4. Run `pnpm db:migrate`
5. Run `pnpm dev`
