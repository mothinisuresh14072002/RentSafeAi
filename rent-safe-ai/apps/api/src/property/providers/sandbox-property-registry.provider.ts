import { Injectable, Logger } from '@nestjs/common';
import {
  PropertyRegistryProvider,
  RegistryLookupResult,
} from './property-registry.provider';

@Injectable()
export class SandboxPropertyRegistryProvider
  implements PropertyRegistryProvider
{
  private readonly logger = new Logger(SandboxPropertyRegistryProvider.name);

  async lookupProperty(
    registryReference: string,
  ): Promise<RegistryLookupResult> {
    this.logger.log(
      `[Sandbox] Looking up property registry reference: ${registryReference}`,
    );

    await new Promise((resolve) => setTimeout(resolve, 600));

    // For local testing, any reference starting with TN-SANDBOX- is considered valid
    // and returns "Demo Owner" as the legal owner.
    if (registryReference.startsWith('TN-SANDBOX-')) {
      return {
        exists: true,
        legalOwnerName: 'Demo Owner',
        address: '12 Example Street, Adyar, Chennai, Tamil Nadu 600020',
        registrationDate: new Date('2022-01-15'),
        statusMessage: 'Sandbox record found',
      };
    }

    if (registryReference.startsWith('TN-FAIL-')) {
      return {
        exists: true,
        legalOwnerName: 'Not Demo Owner',
        address: '12 Example Street, Adyar, Chennai',
        statusMessage: 'Sandbox record found with different owner',
      };
    }

    return {
      exists: false,
      statusMessage: 'Record not found in sandbox registry',
    };
  }
}
