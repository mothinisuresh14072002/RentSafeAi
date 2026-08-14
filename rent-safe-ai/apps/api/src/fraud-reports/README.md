# Fraud reports

The report API is mounted at `/fraud-reports`.

- `POST /fraud-reports` — tenant-only report submission.
- `GET /fraud-reports/mine` — tenant's own status view.
- `GET /fraud-reports/queue` — reviewer/admin triage queue.
- `POST /fraud-reports/:id/actions` — reviewer/admin assignment and resolution.

Configuration:

- `FRAUD_REPORTS_PER_DAY` (default `5`) limits reports per tenant per rolling day.
- `FRAUD_HIGH_SEVERITY_PAYMENT_HOLD` (default enabled) creates a pending payment hold for high-risk reports.
- `FRAUD_NOTIFY_OWNER` (default enabled) sends the affected owner a generic safety notification without reporter identity.

After deploying, apply the Prisma schema migration for `payment_holds` and the added fraud-report fields.
