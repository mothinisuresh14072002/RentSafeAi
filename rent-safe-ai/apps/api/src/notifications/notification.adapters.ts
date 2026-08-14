import { Injectable, Logger } from '@nestjs/common';

export interface EmailAdapter {
  send(to: string, subject: string, body: string): Promise<void>;
}
export interface LocalNotificationAdapter {
  send(userId: string, title: string, body: string): Promise<void>;
}

@Injectable()
export class LoggingEmailAdapter implements EmailAdapter {
  private readonly logger = new Logger(LoggingEmailAdapter.name);
  async send(to: string, subject: string, body: string) {
    this.logger.log(`[LOCAL EMAIL] to=${to} subject=${subject} body=${body}`);
  }
}

@Injectable()
export class LocalNotificationAdapterImpl implements LocalNotificationAdapter {
  private readonly logger = new Logger(LocalNotificationAdapterImpl.name);
  async send(userId: string, title: string, body: string) {
    this.logger.log(
      `[LOCAL NOTIFICATION] user=${userId} title=${title} body=${body}`,
    );
  }
}
