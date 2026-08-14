export interface StructuredAddressDto {
  buildingNumber: string;
  street: string;
  locality: string;
  city: string; // Should be enforced as Chennai
  district: string;
  state: string; // Tamil Nadu
  pinCode: string;
}

export interface GeocodingProvider {
  geocodeAddress(structuredAddress: StructuredAddressDto): Promise<{ latitude: number; longitude: number }>;
}
