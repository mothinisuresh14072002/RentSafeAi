import { AuditReasonGuard, AUDIT_REASON_REQUIRED } from './audit-reason.guard';
import { Reflector } from '@nestjs/core';
import { BadRequestException } from '@nestjs/common';

describe('AuditReasonGuard', () => {
  let guard: AuditReasonGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new AuditReasonGuard(reflector);
  });

  it('should allow if not required', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    const context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn(),
    } as any;
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should throw if required and no header provided', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
    const context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ headers: {} }),
      }),
    } as any;

    expect(() => guard.canActivate(context)).toThrow(BadRequestException);
  });

  it('should allow if required and header provided', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
    const req = {
      headers: { 'x-audit-reason': 'User request' },
      auditReason: null,
    };
    const context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => req,
      }),
    } as any;

    expect(guard.canActivate(context)).toBe(true);
    expect(req.auditReason).toBe('User request');
  });
});
