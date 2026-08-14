import { HammingDistanceUtil } from './hamming.util';

describe('HammingDistanceUtil', () => {
  it('calculates distance accurately', () => {
    expect(HammingDistanceUtil.calculate('1010', '1010')).toBe(0);
    expect(HammingDistanceUtil.calculate('1010', '1110')).toBe(1);
    expect(HammingDistanceUtil.calculate('0000', '1111')).toBe(4);
  });

  it('throws if lengths mismatch', () => {
    expect(() => HammingDistanceUtil.calculate('10', '100')).toThrow();
  });
});
