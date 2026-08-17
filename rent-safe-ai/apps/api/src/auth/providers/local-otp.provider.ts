import { Injectable, Logger } from '@nestjs/common';
import { OtpProvider } from '../interfaces/otp-provider.interface';

import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class LocalOtpProvider implements OtpProvider {
  private readonly logger = new Logger(LocalOtpProvider.name);

  async sendOtp(phone: string, otp: string): Promise<void> {
    if (process.env.NODE_ENV !== 'production') {
      this.logger.log(`[MOCK OTP] Sent OTP ${otp} to ${phone}`);
      
      // Also write it to a file so it's super easy to find!
      try {
        const filePath = path.join(process.cwd(), 'LATEST_OTP.txt');
        fs.writeFileSync(filePath, `Your latest OTP code is: ${otp}\nGenerated for: ${phone}\nTime: ${new Date().toLocaleTimeString()}`);
      } catch (err) {
        this.logger.error('Failed to write OTP to file', err);
      }
    } else {
      // In a real environment, this should throw or be replaced by a real provider
      this.logger.warn(
        `Attempted to use LocalOtpProvider in production for phone ${phone}`,
      );
    }
  }
}
