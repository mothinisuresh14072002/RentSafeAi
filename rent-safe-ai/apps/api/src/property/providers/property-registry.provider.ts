export interface RegistryLookupResult {
  exists: boolean;
  legalOwnerName?: string;
  address?: string;
  registrationDate?: Date;
  statusMessage?: string;
}

export abstract class PropertyRegistryProvider {
  /**
   * Queries the authoritative government or state registry for the property existence and ownership.
   */
  abstract lookupProperty(
    registryReference: string,
  ): Promise<RegistryLookupResult>;
}
