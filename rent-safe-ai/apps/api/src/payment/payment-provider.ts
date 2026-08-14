export interface ProviderOrder {
  providerOrderId: string;
  amount: number;
  currency: string;
  sandbox: boolean;
}

export interface PaymentProvider {
  createOrder(input: { orderId: string; amount: number; currency: string; idempotencyKey: string }): Promise<ProviderOrder>;
  verifyWebhookSignature(payload: unknown, signature: string): boolean;
}
