import { Injectable } from '@nestjs/common';
import { SignalSeverity } from '@prisma/client';

export interface RuleDefinition {
  /** Unique rule code persisted in RiskSignal.ruleCode */
  code: string;
  /** Human-readable description */
  description: string;
  severity: SignalSeverity;
  /**
   * If true this rule creates a hard block — payment / publishing is disabled
   * regardless of numeric score.
   */
  isHardBlock: boolean;
  /** Semver-style rule version for auditing */
  version: string;
}

@Injectable()
export class RuleRegistry {
  private readonly rules: Map<string, RuleDefinition> = new Map();

  constructor() {
    this.register({
      code: 'DUPLICATE_PROPERTY_ADDRESS',
      description:
        'Normalized address already exists for a different active property.',
      severity: SignalSeverity.HIGH,
      isHardBlock: true,
      version: '1.0.0',
    });
    this.register({
      code: 'DUPLICATE_PROPERTY_IDENTIFIER',
      description:
        'Survey/door number identifier is already linked to another active property.',
      severity: SignalSeverity.HIGH,
      isHardBlock: true,
      version: '1.0.0',
    });
    this.register({
      code: 'DUPLICATE_DOCUMENT_HASH',
      description:
        'SHA-256 of an uploaded document matches a document on another entity.',
      severity: SignalSeverity.HIGH,
      isHardBlock: false,
      version: '1.0.0',
    });
    this.register({
      code: 'DUPLICATE_IMAGE_PHASH',
      description:
        'Perceptual hash of uploaded image is within threshold of image on another listing.',
      severity: SignalSeverity.MEDIUM,
      isHardBlock: false,
      version: '1.0.0',
    });
    this.register({
      code: 'KYC_OWNER_NAME_MISMATCH',
      description:
        'KYC verified name does not match bank beneficiary name beyond configured tolerance.',
      severity: SignalSeverity.HIGH,
      isHardBlock: true,
      version: '1.0.0',
    });
    this.register({
      code: 'MAP_ADDRESS_MISMATCH',
      description:
        'Property geocoded coordinates are outside configurable distance from address pin.',
      severity: SignalSeverity.MEDIUM,
      isHardBlock: false,
      version: '1.0.0',
    });
    this.register({
      code: 'SUSPICIOUS_LOCALITY_PRICE',
      description:
        'Rent amount is a statistical outlier (>3σ) for the declared Chennai locality.',
      severity: SignalSeverity.LOW,
      isHardBlock: false,
      version: '1.0.0',
    });
    this.register({
      code: 'REPEATED_REJECTION',
      description:
        'Owner has had 3 or more property verifications rejected in the past 90 days.',
      severity: SignalSeverity.MEDIUM,
      isHardBlock: false,
      version: '1.0.0',
    });
    this.register({
      code: 'PAYMENT_BEFORE_VIEWING',
      description:
        'Payment attempt initiated before a confirmed viewing record exists.',
      severity: SignalSeverity.CRITICAL,
      isHardBlock: true,
      version: '1.0.0',
    });
    this.register({
      code: 'CRITICAL_CHANGE_AFTER_APPROVAL',
      description:
        'Critical listing field changed after the listing was approved.',
      severity: SignalSeverity.HIGH,
      isHardBlock: true,
      version: '1.0.0',
    });
    this.register({
      code: 'EXPIRED_VERIFICATION',
      description:
        'A mandatory verification (KYC, property evidence, or presence challenge) has expired.',
      severity: SignalSeverity.HIGH,
      isHardBlock: true,
      version: '1.0.0',
    });
    this.register({
      code: 'REUSED_CONTACT_PATTERN',
      description:
        'Phone or email contact pattern matches a previously suspended account.',
      severity: SignalSeverity.HIGH,
      isHardBlock: false,
      version: '1.0.0',
    });
  }

  register(rule: RuleDefinition) {
    this.rules.set(rule.code, rule);
  }

  get(code: string): RuleDefinition | undefined {
    return this.rules.get(code);
  }

  getAll(): RuleDefinition[] {
    return Array.from(this.rules.values());
  }

  isHardBlock(code: string): boolean {
    return this.rules.get(code)?.isHardBlock ?? false;
  }
}
