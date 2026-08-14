export type NotificationChannelName = 'IN_APP' | 'EMAIL' | 'SMS' | 'PUSH';

export interface NotificationEvent {
  userId: string;
  title: string;
  body: string;
  eventType: string;
  deduplicationKey: string;
  channels?: NotificationChannelName[];
  data?: Record<string, unknown>;
}
