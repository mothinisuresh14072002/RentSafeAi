import { RedactionUtil } from './redaction.util';

describe('RedactionUtil', () => {
  it('masks phone', () => {
    expect(RedactionUtil.maskPhone('+919999994321')).toBe('*********4321');
    expect(RedactionUtil.maskPhone('123')).toBe('***');
    expect(RedactionUtil.maskPhone(null)).toBeNull();
  });

  it('masks email', () => {
    expect(RedactionUtil.maskEmail('john@example.com')).toBe('j***@example.com');
    expect(RedactionUtil.maskEmail('a@b.com')).toBe('*@b.com');
  });

  it('masks Aadhaar', () => {
    expect(RedactionUtil.maskAadhaar('123456789012')).toBe('********9012');
  });

  it('masks PAN', () => {
    expect(RedactionUtil.maskPan('ABCDE1234F')).toBe('ABC****34F');
  });

  it('masks Bank Account', () => {
    expect(RedactionUtil.maskBankAccount('123456789')).toBe('*****6789');
  });
});
