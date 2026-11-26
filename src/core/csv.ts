import type { State } from './types.ts';
import { plain } from './money.ts';
import { byId, categoryName } from './ledger.ts';

/** Quotes a field and neutralises text that a spreadsheet would run as a formula. */
export function csvField(text: string): string {
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

const pad = (n: number) => String(n).padStart(2, '0');
/** The local date as YYYY-MM-DD, for records and file names. */
export function localDay(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function stamp(ms: number): string {
  const d = new Date(ms);
  return `${localDay(ms)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function toCsv(state: State): string {
  const accounts = byId(state.accounts);
  const categories = byId(state.categories);
  const lines = ['Date,Type,Account,To account,Category,Amount,Currency,Received,Received currency,Base amount,Base currency,Note'];
  for (const t of [...state.txns].sort((a, b) => a.date - b.date)) {
    const from = accounts.get(t.accountId);
    const to = t.toAccountId ? accounts.get(t.toAccountId) : undefined;
    const code = from?.currency ?? t.baseCurrency;
    lines.push([
      stamp(t.date), t.kind, csvField(from?.name ?? ''), csvField(to?.name ?? ''),
      csvField(t.categoryId ? categoryName(t.categoryId, categories) : ''),
      plain(t.amount, code), code, to ? plain(t.toAmount, to.currency) : '', to?.currency ?? '',
      plain(t.baseAmount, t.baseCurrency), t.baseCurrency, csvField(t.note),
    ].join(','));
  }
  return lines.join('\r\n') + '\r\n';
}
