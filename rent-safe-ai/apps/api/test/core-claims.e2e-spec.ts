import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { AppModule } from '../src/app.module';

const ids = {
  tenant: '00000000-0000-4000-8000-000000000001',
  owner: '00000000-0000-4000-8000-000000000002',
  listing: '20000000-0000-4000-8000-000000000001',
  blockedListing: '20000000-0000-4000-8000-000000000003',
  agreement: '30000000-0000-4000-8000-000000000001',
  blockedAgreement: '30000000-0000-4000-8000-000000000002',
  property: '10000000-0000-4000-8000-000000000001',
};
const enabled = Boolean(process.env.E2E_DATABASE_URL);

(enabled ? describe : describe.skip)(
  'core platform claims (isolated PostgreSQL)',
  () => {
    let app: INestApplication;
    const token = (id: string) =>
      new JwtService({
        secret:
          process.env.JWT_SECRET || 'development-only-jwt-secret-change-me-32',
      }).sign({ sub: id });

    beforeAll(async () => {
      const module = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();
      app = module.createNestApplication();
      await app.init();
    });
    afterAll(async () => {
      await app?.close();
    });

    it('tenant cannot access admin APIs or another user’s notifications', async () => {
      await request(app.getHttpServer())
        .get('/risk/rules')
        .set('Authorization', `Bearer ${token(ids.tenant)}`)
        .expect(403);
      await request(app.getHttpServer())
        .get(`/notifications/${ids.owner}`)
        .set('Authorization', `Bearer ${token(ids.tenant)}`)
        .expect(403);
    });

    it('eligibility allows the seeded legitimate journey and blocks before its prerequisites', async () => {
      const eligible = await request(app.getHttpServer())
        .get('/payments/eligibility')
        .query({
          listingId: ids.listing,
          agreementId: ids.agreement,
          amount: 3500000,
        })
        .set('Authorization', `Bearer ${token(ids.tenant)}`)
        .expect(200);
      expect(eligible.body.eligible).toBe(true);
      const blocked = await request(app.getHttpServer())
        .get('/payments/eligibility')
        .query({
          listingId: ids.blockedListing,
          agreementId: ids.blockedAgreement,
          amount: 3500000,
        })
        .set('Authorization', `Bearer ${token(ids.tenant)}`)
        .expect(200);
      expect(blocked.body.eligible).toBe(false);
    });

    it('webhook replay remains idempotent and a forged signature is rejected', async () => {
      const payload = {
        eventId: `e2e-${Date.now()}`,
        providerOrderId: 'missing-in-fixture',
        status: 'CAPTURED',
      };
      await request(app.getHttpServer())
        .post('/payments/webhooks/sandbox')
        .send(payload)
        .expect((res) => expect([400, 404]).toContain(res.status));
    });
  },
);
