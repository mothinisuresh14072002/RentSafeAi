/**
 * Formatting utilities used across both portals.
 */

const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Convert paise (API storage) to a display ₹ string. e.g. 1500000 → "₹15,000.00" */
export function formatINR(paise: number): string {
  return inrFormatter.format(paise / 100);
}

/** Convert rupee input value to paise for API submission. e.g. 15000 → 1500000 */
export function rupeesToPaise(rupees: number | string): number {
  const val = typeof rupees === 'string' ? parseFloat(rupees) : rupees;
  if (isNaN(val)) return 0;
  return Math.round(val * 100);
}

/** Convert paise to rupees (display value). */
export function paiseToRupees(paise: number): number {
  return paise / 100;
}

const dateFormatter = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

const dateTimeFormatter = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: true,
});

/** Format ISO date string. e.g. "15 Aug 2026" */
export function formatDate(iso: string | Date | null | undefined): string {
  if (!iso) return '—';
  try {
    return dateFormatter.format(new Date(iso));
  } catch {
    return '—';
  }
}

/** Format ISO date-time string. e.g. "15 Aug 2026, 2:30 PM" */
export function formatDateTime(iso: string | Date | null | undefined): string {
  if (!iso) return '—';
  try {
    return dateTimeFormatter.format(new Date(iso));
  } catch {
    return '—';
  }
}

/** Returns positive integer days until expiry, or negative if already expired. */
export function daysUntilExpiry(iso: string | Date | null | undefined): number {
  if (!iso) return -Infinity;
  const diff = new Date(iso).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/** Returns relative time string. e.g. "3 days ago", "in 2 hours" */
const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

export function formatRelative(iso: string | Date | null | undefined): string {
  if (!iso) return '—';
  const diffMs = new Date(iso).getTime() - Date.now();
  const diffSec = diffMs / 1000;
  const diffMin = diffSec / 60;
  const diffHr = diffMin / 60;
  const diffDay = diffHr / 24;
  if (Math.abs(diffDay) >= 1) return rtf.format(Math.round(diffDay), 'day');
  if (Math.abs(diffHr) >= 1) return rtf.format(Math.round(diffHr), 'hour');
  if (Math.abs(diffMin) >= 1) return rtf.format(Math.round(diffMin), 'minute');
  return rtf.format(Math.round(diffSec), 'second');
}

/** Truncate a string to maxLen with ellipsis */
export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 3) + '…';
}

/** Mask an account number showing only last 4 digits */
export function maskAccount(account: string): string {
  if (account.length <= 4) return account;
  return '****' + account.slice(-4);
}
