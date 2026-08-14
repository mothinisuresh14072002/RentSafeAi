import { Module } from '@nestjs/common';
import {
  PaymentController,
  PaymentWebhookController,
} from './payment.controller';
import { PaymentService } from './payment.service';
import { PaymentEligibilityService } from './payment-eligibility.service';
import {
  RazorpayTestPaymentProvider,
  SandboxPaymentProvider,
} from './sandbox-payment.provider';

@Module({
  controllers: [PaymentController, PaymentWebhookController],
  providers: [
    PaymentService,
    PaymentEligibilityService,
    SandboxPaymentProvider,
    RazorpayTestPaymentProvider,
    {
      provide: 'PAYMENT_PROVIDER',
      useFactory: (
        sandbox: SandboxPaymentProvider,
        razorpay: RazorpayTestPaymentProvider,
      ) =>
        process.env.PAYMENT_PROVIDER === 'razorpay-test' ? razorpay : sandbox,
      inject: [SandboxPaymentProvider, RazorpayTestPaymentProvider],
    },
  ],
})
export class PaymentModule {}
