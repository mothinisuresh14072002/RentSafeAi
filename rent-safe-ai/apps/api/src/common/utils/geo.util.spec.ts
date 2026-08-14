import { GeoUtil } from './geo.util';

describe('GeoUtil', () => {
  it('calculates distance correctly (approximate)', () => {
    // Chennai Central to Egmore is roughly 2km
    const lat1 = 13.0827;
    const lon1 = 80.2707;
    const lat2 = 13.0780;
    const lon2 = 80.2600;
    
    const distance = GeoUtil.calculateDistance(lat1, lon1, lat2, lon2);
    
    // Check if it's within 1-2 kilometers
    expect(distance).toBeGreaterThan(1000);
    expect(distance).toBeLessThan(2000);
  });

  it('calculates zero distance for identical points', () => {
    expect(GeoUtil.calculateDistance(13.0, 80.0, 13.0, 80.0)).toBe(0);
  });
});
