export class RedactionUtil {
  static maskPhone(phone: string | null | undefined): string | null {
    if (!phone) return null;
    const cleanPhone = phone.replace(/[^\d+]/g, '');
    if (cleanPhone.length < 5) return '***';
    // e.g. +919999994321 -> ******4321
    const lastFour = cleanPhone.slice(-4);
    return '*'.repeat(cleanPhone.length - 4) + lastFour;
  }

  static maskEmail(email: string | null | undefined): string | null {
    if (!email) return null;
    const parts = email.split('@');
    if (parts.length !== 2) return '***';
    const [local, domain] = parts;
    if (local.length <= 1) return `*@${domain}`;
    return `${local[0]}***@${domain}`;
  }

  static maskAadhaar(uid: string | null | undefined): string | null {
    if (!uid) return null;
    const cleanUid = uid.replace(/[^\d]/g, '');
    if (cleanUid.length !== 12) return '***';
    return '********' + cleanUid.slice(-4);
  }

  static maskPan(pan: string | null | undefined): string | null {
    if (!pan) return null;
    const cleanPan = pan.trim().toUpperCase();
    if (cleanPan.length !== 10) return '***';
    // PAN: ABCDE1234F -> ABC****234
    return cleanPan.substring(0, 3) + '****' + cleanPan.substring(7);
  }

  static maskBankAccount(account: string | null | undefined): string | null {
    if (!account) return null;
    const cleanAccount = account.replace(/[^\d]/g, '');
    if (cleanAccount.length < 4) return '***';
    return '*'.repeat(cleanAccount.length - 4) + cleanAccount.slice(-4);
  }
}
