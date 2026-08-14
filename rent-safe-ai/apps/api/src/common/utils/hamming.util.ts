export class HammingDistanceUtil {
  /**
   * Calculates the Hamming distance between two binary strings (or hex strings).
   * For this implementation, we assume pHash is stored as a 64-character binary string (e.g., '10101...').
   * If they are hex strings, you would need to convert them to binary first.
   */
  static calculate(hash1: string, hash2: string): number {
    if (hash1.length !== hash2.length) {
      throw new Error('Hashes must be of equal length');
    }

    let distance = 0;
    for (let i = 0; i < hash1.length; i++) {
      if (hash1[i] !== hash2[i]) {
        distance++;
      }
    }
    return distance;
  }
}
