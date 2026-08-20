export interface OwnershipMatchInput {
  ownerName: string;
  registryOwnerName: string;
  documentOwnerName?: string | null;
  propertyAddress?: string | null;
  registryAddress?: string | null;
}

export interface OwnershipConfidence {
  registryOwnerScore: number;
  documentOwnerScore: number;
  addressScore: number;
  overallScore: number;
  ownerMatch: boolean;
  documentMatch: boolean;
  addressMatch: boolean;
}

const TITLES = new Set(['MR', 'MRS', 'MS', 'MISS', 'DR', 'PROF', 'SRI', 'SMT']);

export function normalizeIdentityName(value: string | null | undefined): string {
  if (!value) return '';
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .filter((token) => !TITLES.has(token))
    .join(' ');
}

export function normalizeAddress(value: string | null | undefined): string {
  if (!value) return '';
  return value
    .normalize('NFKD')
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, ' ')
    .replace(/\bROAD\b/g, 'RD')
    .replace(/\bSTREET\b/g, 'ST')
    .replace(/\bAVENUE\b/g, 'AVE')
    .replace(/\bLANE\b/g, 'LN')
    .split(/\s+/)
    .filter(Boolean)
    .join(' ');
}

function levenshtein(a: string, b: string): number {
  const prev = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= b.length; j += 1) {
      current[j] = Math.min(
        current[j - 1] + 1,
        prev[j] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    for (let j = 0; j <= b.length; j += 1) prev[j] = current[j];
  }
  return prev[b.length];
}

export function similarity(a: string | null | undefined, b: string | null | undefined): number {
  const left = normalizeIdentityName(a);
  const right = normalizeIdentityName(b);
  if (!left || !right) return 0;
  if (left === right) return 1;

  const leftTokens = left.split(' ');
  const rightTokens = right.split(' ');
  const leftSet = new Set(leftTokens);
  const rightSet = new Set(rightTokens);
  const intersection = leftTokens.filter((token) => rightSet.has(token)).length;
  const union = new Set([...leftTokens, ...rightTokens]).size;
  const tokenScore = union ? intersection / union : 0;

  const leftFirst = leftTokens[0];
  const rightFirst = rightTokens[0];
  const leftLast = leftTokens[leftTokens.length - 1];
  const rightLast = rightTokens[rightTokens.length - 1];
  const initialCompatible =
    leftLast === rightLast &&
    leftFirst.length === 1 &&
    rightFirst.startsWith(leftFirst);
  const reverseInitialCompatible =
    leftLast === rightLast &&
    rightFirst.length === 1 &&
    leftFirst.startsWith(rightFirst);

  if (initialCompatible || reverseInitialCompatible) return 0.86;

  const editScore = 1 - levenshtein(left, right) / Math.max(left.length, right.length);
  return Math.max(tokenScore, editScore * 0.85);
}

export function addressSimilarity(a: string | null | undefined, b: string | null | undefined): number {
  const left = normalizeAddress(a);
  const right = normalizeAddress(b);
  if (!left || !right) return 0;
  if (left === right) return 1;
  const leftTokens = new Set(left.split(' '));
  const rightTokens = new Set(right.split(' '));
  const intersection = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  const union = new Set([...leftTokens, ...rightTokens]).size;
  return union ? intersection / union : 0;
}

export function calculateOwnershipConfidence(input: OwnershipMatchInput): OwnershipConfidence {
  const registryOwnerScore = similarity(input.ownerName, input.registryOwnerName);
  const documentOwnerScore = input.documentOwnerName
    ? similarity(input.ownerName, input.documentOwnerName)
    : 0;
  const addressScore = addressSimilarity(input.propertyAddress, input.registryAddress);

  const documentAvailable = Boolean(normalizeIdentityName(input.documentOwnerName));
  const addressAvailable = Boolean(normalizeAddress(input.propertyAddress) && normalizeAddress(input.registryAddress));

  const weighted =
    registryOwnerScore * 0.55 +
    (documentAvailable ? documentOwnerScore * 0.25 : 0) +
    (addressAvailable ? addressScore * 0.2 : 0);

  const ownerMatch = registryOwnerScore >= 0.82;
  const documentMatch = !documentAvailable || documentOwnerScore >= 0.78;
  const addressMatch = !addressAvailable || addressScore >= 0.55;

  return {
    registryOwnerScore,
    documentOwnerScore,
    addressScore,
    overallScore: Number(weighted.toFixed(4)),
    ownerMatch,
    documentMatch,
    addressMatch,
  };
}
