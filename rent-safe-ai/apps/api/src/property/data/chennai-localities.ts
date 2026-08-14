export const CHENNAI_LOCALITIES = [
  'Adyar',
  'Anna Nagar',
  'Besant Nagar',
  'Egmore',
  'Guindy',
  'Kk Nagar',
  'Kodambakkam',
  'Madipakkam',
  'Mylapore',
  'Nungambakkam',
  'Omr',
  'Perungudi',
  'Porur',
  'T Nagar',
  'Tambaram',
  'Thiruvanmiyur',
  'Velachery',
  'Virugambakkam',
].map((l) => l.toUpperCase());

export function isValidChennaiLocality(locality: string): boolean {
  if (!locality) return false;
  return CHENNAI_LOCALITIES.includes(locality.toUpperCase().trim());
}

export function isValidChennaiPinCode(pinCode: string): boolean {
  if (!pinCode) return false;
  const cleanPin = pinCode.replace(/\s+/g, '');
  return /^(600|603)\d{3}$/.test(cleanPin);
}
