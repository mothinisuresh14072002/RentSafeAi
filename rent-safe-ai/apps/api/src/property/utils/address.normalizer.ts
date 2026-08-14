import { StructuredAddressDto } from '../providers/geocoding.provider';
import * as crypto from 'crypto';

export class AddressNormalizer {
  static normalizeAddress(address: StructuredAddressDto): string {
    // Standardize to lowercase and remove all special characters except spaces
    const clean = (str: string) =>
      (str || '')
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();

    const parts = [
      clean(address.buildingNumber),
      clean(address.street),
      clean(address.locality),
      clean(address.city),
      clean(address.pinCode),
    ];

    return parts.join('|');
  }

  static hashAddress(address: StructuredAddressDto): string {
    const normalized = this.normalizeAddress(address);
    return crypto.createHash('sha256').update(normalized).digest('hex');
  }
}
