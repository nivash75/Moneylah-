import type { Rate, Txn, Account } from './types.ts';

const ZERO = new Set(['BIF', 'CLP', 'DJF', 'GNF', 'ISK', 'JPY', 'KMF', 'KRW', 'PYG', 'RWF', 'UGX', 'VND', 'VUV', 'XAF', 'XOF', 'XPF']);
const THREE = new Set(['BHD', 'IQD', 'JOD', 'KWD', 'LYD', 'OMR', 'TND']);
export const MAX_MINOR = 999_999_999_999_999;
export const CURRENCIES = ['SGD', 'USD', 'EUR', 'GBP', 'INR', 'MYR', 'IDR', 'AUD', 'CAD', 'CHF', 'CNY', 'HKD', 'JPY', 'KRW', 'THB', 'VND', 'PHP', 'TWD', 'NZD', 'AED', 'SAR', 'LKR'];

/** A fixed table, so the stored scale never depends on the device's locale data. */
export const digits = (code: string) => (ZERO.has(code) ? 0 : THREE.has(code) ? 3 : 2);
export const isCurrencyCode = (code: unknown): code is string => typeof code === 'string' && /^[A-Z]{3}$/.test(code);

export function format(minor: number, code: string, locale?: string): string {
  const d = digits(code);
  return new Intl.NumberFormat(locale, { style: 'currency', currency: code, minimumFractionDigits: d, maximumFractionDigits: d }).format(minor / 10 ** d);
}

/** Plain text such as "1234.50", built from the integer so no float rounding occurs. */
export function plain(minor: number, code: string, separator = '.'): string {
  const d = digits(code);
  const text = String(Math.abs(minor)).padStart(d + 1, '0');
  const body = d === 0 ? text : `${text.slice(0, -d)}${separator}${text.slice(-d)}`;
  return minor < 0 ? `-${body}` : body;
}

/** Thousands grouping with commas, including the Indian 12,34,567 style. */
const GROUPED = /^-?(?:[1-9]\d{0,2}(?:,\d{3})+|[1-9]\d?(?:,\d{2})*,\d{3})$/;

/** Strict parse of typed input. Returns null for junk, too many decimals or absurd sizes. */
export function parseAmount(input: string, code: string, separator = '.'): number | null {
  const grouping = separator === ',' ? '.' : ',';
  const [head, ...tail] = input.trim().split(separator);
  const groups = head.split(grouping);
  // A misplaced mark is likely a mistyped decimal point: dropping it would turn 12,50 into 1250.
  if (groups.length > 1 && !GROUPED.test(groups.join(','))) return null;
  const text = [groups.join(''), ...tail].join('.');
  const match = /^(-?)(\d*)(?:\.(\d*))?$/.exec(text);
  if (!match) return null;
  const [, sign, whole, fraction = ''] = match;
  if (!whole && !fraction) return null;
  if (fraction.length > digits(code)) return null;
  const minor = Number((whole || '0') + fraction.padEnd(digits(code), '0'));
  if (!Number.isSafeInteger(minor) || minor > MAX_MINOR) return null;
  return sign && minor !== 0 ? -minor : minor;
}

/** Converts using a typed rate, where 1 `unit` is worth `rate` of the other currency. */
export function convertAt(minor: number, from: string, to: string, unit: string, rate: number): number | null {
  if (!Number.isFinite(rate) || rate <= 0) return null;
  const major = minor / 10 ** digits(from);
  const result = Math.round((from === unit ? major * rate : major / rate) * 10 ** digits(to));
  return Number.isFinite(result) && Math.abs(result) <= MAX_MINOR ? result : null;
}

/** What 1 `unit` is worth in `other`, given matching amounts of each. */
export const rateBetween = (unitMinor: number, unit: string, otherMinor: number, other: string) =>
  otherMinor / 10 ** digits(other) / (unitMinor / 10 ** digits(unit));

export interface Converter {
  base: string;
  /** null when no rate is known. Callers must surface that rather than assume 1:1. */
  convert(minor: number, from: string, to?: string): number | null;
  valueOf(txn: Txn, accounts: Map<string, Account>): number | null;
}

export function makeConverter(base: string, rates: Rate[]): Converter {
  const toBase = new Map<string, number>();
  const valid = rates.filter((r) => Number.isFinite(r.rate) && r.rate > 0);
  // Inverse rates first so that a direct rate wins.
  for (const r of valid) if (r.id === base) toBase.set(r.base, 1 / r.rate);
  for (const r of valid) if (r.base === base) toBase.set(r.id, r.rate);
  toBase.set(base, 1);

  const convert = (minor: number, from: string, to = base): number | null => {
    if (from === to) return minor;
    const source = toBase.get(from);
    const target = toBase.get(to);
    if (source === undefined || target === undefined) return null;
    const result = Math.round((minor * source * 10 ** digits(to)) / (target * 10 ** digits(from)));
    return Number.isFinite(result) && Math.abs(result) <= MAX_MINOR ? result : null;
  };

  return {
    base,
    convert,
    valueOf(txn, accounts) {
      if (txn.baseCurrency === base) return txn.baseAmount;
      const code = accounts.get(txn.accountId)?.currency;
      return code ? convert(txn.amount, code) : convert(txn.baseAmount, txn.baseCurrency);
    },
  };
}
