import { Injectable } from '@nestjs/common';
import { GeocodingProvider, StructuredAddressDto } from './geocoding.provider';

@Injectable()
export class SandboxGeocodingProvider implements GeocodingProvider {
  async geocodeAddress(address: StructuredAddressDto): Promise<{ latitude: number; longitude: number }> {
    // In sandbox, we just return a rough coordinate based on Locality or a default Chennai center
    // 13.0827° N, 80.2707° E is Chennai
    let lat = 13.0827;
    let lng = 80.2707;

    const localityMap: Record<string, { lat: number; lng: number }> = {
      ADYAR: { lat: 13.0012, lng: 80.2565 },
      VELACHERY: { lat: 12.9815, lng: 80.2180 },
      'ANNA NAGAR': { lat: 13.0850, lng: 80.2101 },
      'T NAGAR': { lat: 13.0418, lng: 80.2341 },
    };

    const loc = address.locality?.toUpperCase().trim();
    if (loc && localityMap[loc]) {
      lat = localityMap[loc].lat;
      lng = localityMap[loc].lng;
    }

    // Add slight deterministic jitter based on string length to prevent exact overlaps 
    // unless they are the same locality.
    const jitter = (address.buildingNumber.length * 0.0001);

    return {
      latitude: lat + jitter,
      longitude: lng + jitter,
    };
  }
}
