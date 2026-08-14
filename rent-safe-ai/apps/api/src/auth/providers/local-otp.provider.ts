import { Injectable, Logger } from '@nestjs/common';
import { OtpProvider } from '../interfaces/otp-provider.interface';

@Injectable()
export class LocalOtpProvider implements OtpProvider {
  private readonly logger = new Logger(LocalOtpProvider.name);

  async sendOtp(phone: string, otp: string): Promise<void> {
    if (process.env.NODE_ENV !== 'production') {
      this.logger.log(`[MOCK OTP] Sent OTP ${otp} to ${phone}`);
    } else {
      // In a real environment, this should throw or be replaced by a real provider
      this.logger.warn(
        `Attempted to use LocalOtpProvider in production for phone ${phone}`,
      );
    }
  }
}
