import {
  addressSimilarity,
  calculateOwnershipConfidence,
  normalizeIdentityName,
  similarity,
} from './ownership-confidence';

describe('ownership-confidence', () => {
  it('normalizes titles, punctuation and casing', () => {
    expect(normalizeIdentityName('Dr. Mothini-Suresh')).toBe('MOTHINI SURESH');
  });

  it('handles initials and small OCR/name variations', () => {
    expect(similarity('Mothini Suresh', 'M Suresh')).toBeGreaterThanOrEqual(0.82);
    expect(similarity('Ravi Kumar', 'Ravi Kumarr')).toBeGreaterThan(0.75);
  });

  it('returns exact match for the same identity', () => {
    expect(similarity('Demo Owner', 'Demo Owner')).toBe(1);
  });

  it('scores common address token overlap', () => {
    expect(
      addressSimilarity(
        '12 Example Street, Adyar, Chennai, Tamil Nadu 600020',
        '12 Example St Adyar Chennai Tamil Nadu 600020',
      ),
    ).toBeGreaterThanOrEqual(0.7);
  });

  it('requires the authoritative registry owner match', () => {
    const result = calculateOwnershipConfidence({
      ownerName: 'Demo Owner',
      registryOwnerName: 'Demo Owner',
      documentOwnerName: 'Demo Owner',
      propertyAddress: '12 Example Street, Adyar, Chennai, Tamil Nadu 600020',
      registryAddress: '12 Example St, Adyar, Chennai, Tamil Nadu 600020',
    });

    expect(result.ownerMatch).toBe(true);
    expect(result.documentMatch).toBe(true);
    expect(result.addressMatch).toBe(true);
    expect(result.overallScore).toBeGreaterThan(0.9);
  });

  it('flags a conflicting registry owner', () => {
    const result = calculateOwnershipConfidence({
      ownerName: 'Demo Owner',
      registryOwnerName: 'Another Owner',
      documentOwnerName: 'Demo Owner',
    });

    expect(result.ownerMatch).toBe(false);
    expect(result.overallScore).toBeLessThan(0.8);
  });
});
