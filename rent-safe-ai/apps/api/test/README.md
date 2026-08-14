# API integration test environment

Start the isolated PostgreSQL and Redis services, migrate, seed, then run `pnpm --filter api test:e2e`. The suite should use `DATABASE_URL=postgresql://rentsafe_test:rentsafe_test@127.0.0.1:55432/rentsafe_test` and `REDIS_URL=redis://127.0.0.1:56379`.
