import { Injectable, CanActivate, ExecutionContext, BadRequestException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const AUDIT_REASON_REQUIRED = 'auditReasonRequired';
export const AuditReasonRequired = () => {
  return (target: any, key?: string | symbol, descriptor?: TypedPropertyDescriptor<any>) => {
    Reflector.createDecorator<boolean>()(true)(target, key as string, descriptor as PropertyDescriptor);
  };
};

@Injectable()
export class AuditReasonGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isRequired = this.reflector.getAllAndOverride<boolean>(AUDIT_REASON_REQUIRED, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!isRequired) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const reason = request.headers['x-audit-reason'];

    if (!reason || reason.trim() === '') {
      throw new BadRequestException('X-Audit-Reason header is mandatory for this operation');
    }

    request.auditReason = reason.trim();
    return true;
  }
}
