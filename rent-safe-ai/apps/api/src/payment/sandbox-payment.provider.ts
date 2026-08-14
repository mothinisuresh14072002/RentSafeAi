import { Injectable } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';
import { PaymentProvider, ProviderOrder } from './payment-provider';

@Injectable()
export class SandboxPaymentProvider implements PaymentProvider {
  private readonly secret = process.env.PAYMENT_WEBHOOK_SECRET || 'rentsafe-sandbox-webhook-secret';
  async createOrder(input: { orderId: string; amount: number; currency: string; idempotencyKey: string }): Promise<ProviderOrder> {
    return { providerOrderId: `sandbox_${input.idempotencyKey}`, amount: input.amount, currency: input.currency, sandbox: true };
  }
  verifyWebhookSignature(payload: unknown, signature: string) {
    const expected = createHmac('sha256', this.secret).update(JSON.stringify(payload)).digest('hex');
    return Boolean(signature) && signature.length === expected.length && timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  }
}

/** Test-only shape-compatible adapter. It never calls a live gateway. */
@Injectable()
export class RazorpayTestPaymentProvider extends SandboxPaymentProvider {
  async createOrder(input: { orderId: string; amount: number; currency: string; idempotencyKey: string }): Promise<ProviderOrder> {
    const order = await super.createOrder(input);
    return { ...order, providerOrderId: `razorpay_test_${input.idempotencyKey}`, sandbox: true };
  }
}
