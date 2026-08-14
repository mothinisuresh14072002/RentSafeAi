import * as bcrypt from 'bcrypt';

export class CryptoUtil {
  private static readonly SALT_ROUNDS = 10;

  static async hash(data: string): Promise<string> {
    return bcrypt.hash(data, this.SALT_ROUNDS);
  }

  static async compare(data: string, encrypted: string): Promise<boolean> {
    return bcrypt.compare(data, encrypted);
  }
}
