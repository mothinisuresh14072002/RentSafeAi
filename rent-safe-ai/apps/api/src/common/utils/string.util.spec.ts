import { StringUtil } from './string.util';

describe('StringUtil', () => {
  describe('compareNames', () => {
    it('returns true for exact matches', () => {
      expect(StringUtil.compareNames('John Doe', 'John Doe')).toBe(true);
    });

    it('returns true for matches with different casing', () => {
      expect(StringUtil.compareNames('john doe', 'John Doe')).toBe(true);
    });

    it('returns true for matches with extra whitespace', () => {
      expect(StringUtil.compareNames(' john   doe ', 'John Doe')).toBe(true);
    });

    it('returns false for actual mismatches', () => {
      expect(StringUtil.compareNames('Jonathan Doe', 'John Doe')).toBe(false);
    });

    it('returns false if null or undefined', () => {
      expect(StringUtil.compareNames(null, 'John Doe')).toBe(false);
      expect(StringUtil.compareNames('John', undefined)).toBe(false);
    });
  });
});
