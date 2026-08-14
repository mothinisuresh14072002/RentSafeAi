import { ForbiddenException } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
describe('NotificationsController', () => {
  it('rejects cross-user notification access', () => {
    const controller = new NotificationsController({
      list: jest.fn(),
      setPreference: jest.fn(),
    } as any);
    expect(() =>
      controller.list({ user: { userId: 'tenant-a' } }, 'tenant-b'),
    ).toThrow(ForbiddenException);
  });
});
