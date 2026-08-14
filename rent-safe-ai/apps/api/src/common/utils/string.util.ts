export class StringUtil {
  static compareNames(name1: string | null | undefined, name2: string | null | undefined): boolean {
    if (!name1 || !name2) return false;
    
    // Convert to lowercase and remove all whitespace
    const normalize = (str: string) => str.toLowerCase().replace(/\s+/g, '');
    
    return normalize(name1) === normalize(name2);
  }
}
