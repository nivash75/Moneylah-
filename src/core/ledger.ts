import type { Account, Budget, Category, State, Txn } from './types.ts';
import { makeConverter, type Converter } from './money.ts';

export type PeriodUnit = 'week' | 'month' | 'year';
/** Half-open: start is included, end is not. */
export interface Period { unit: PeriodUnit; start: number; end: number }

/** The period containing `date` in local time. Weeks start on `firstDay` (0 = Sunday). */
export function periodOf(unit: PeriodUnit, date: number, firstDay = 1): Period {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = d.getMonth();
  if (unit === 'year') return { unit, start: +new Date(y, 0, 1), end: +new Date(y + 1, 0, 1) };
  if (unit === 'month') return { unit, start: +new Date(y, m, 1), end: +new Date(y, m + 1, 1) };
  const first = d.getDate() - ((d.getDay() - firstDay + 7) % 7);
  return { unit, start: +new Date(y, m, first), end: +new Date(y, m, first + 7) };
}

export function shift(period: Period, count: number): Period {
  const d = new Date(period.start);
  const y = d.getFullYear();
  const m = d.getMonth();
  const next =
    period.unit === 'year' ? new Date(y + count, 0, 1)
    : period.unit === 'month' ? new Date(y, m + count, 1)
    : new Date(y, m, d.getDate() + 7 * count);
  return periodOf(period.unit, +next, d.getDay());
}

export const inPeriod = (p: Period) => (t: Txn) => t.date >= p.start && t.date < p.end;
export const byId = <T extends { id: string }>(items: T[]) => new Map(items.map((i) => [i.id, i]));
export const converterFor = (state: State) => makeConverter(state.settings.baseCurrency, state.rates);

export interface Totals { income: number; expense: number; unconverted: number }

export function totals(txns: Txn[], converter: Converter, accounts: Map<string, Account>): Totals {
  const out: Totals = { income: 0, expense: 0, unconverted: 0 };
  for (const t of txns) {
    if (t.kind === 'transfer') continue;
    const value = converter.valueOf(t, accounts);
    if (value === null) out.unconverted++;
    else out[t.kind] += value;
  }
  return out;
}

export function rootCategory(id: string | null, categories: Map<string, Category>): Category | undefined {
  let node = id ? categories.get(id) : undefined;
  const seen = new Set<string>();
  while (node?.parentId && !seen.has(node.id)) {
    seen.add(node.id);
    const parent = categories.get(node.parentId);
    if (!parent) break;
    node = parent;
  }
  return node;
}

export function categoryName(id: string | null, categories: Map<string, Category>): string {
  const node = id ? categories.get(id) : undefined;
  if (!node) return 'Uncategorised';
  const parent = node.parentId ? categories.get(node.parentId) : undefined;
  return parent ? `${parent.name} › ${node.name}` : node.name;
}

export interface Slice { id: string; name: string; icon: string; amount: number }

/** Amounts per top-level category (subcategories roll up), largest first. */
export function breakdown(txns: Txn[], kind: 'expense' | 'income', converter: Converter, accounts: Map<string, Account>, categories: Map<string, Category>): Slice[] {
  const sums = new Map<string, Slice>();
  for (const t of txns) {
    if (t.kind !== kind) continue;
    const value = converter.valueOf(t, accounts);
    if (value === null) continue;
    const root = rootCategory(t.categoryId, categories);
    const id = root?.id ?? 'none';
    const slice = sums.get(id) ?? { id, name: root?.name ?? 'Uncategorised', icon: root?.icon ?? 'help', amount: 0 };
    slice.amount += value;
    sums.set(id, slice);
  }
  return [...sums.values()].sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name));
}

/** Balance in the account's own currency, counting transactions up to and including `upTo`. */
export function balance(account: Account, txns: Txn[], upTo = Infinity): number {
  let total = account.opening;
  for (const t of txns) {
    if (t.date > upTo) continue;
    if (t.accountId === account.id) total += t.kind === 'income' ? t.amount : -t.amount;
    if (t.kind === 'transfer' && t.toAccountId === account.id) total += t.toAmount;
  }
  return total;
}

/** True when `id` is `ancestor` or sits underneath it. */
export function isWithin(id: string | null, ancestor: string, categories: Map<string, Category>): boolean {
  const seen = new Set<string>();
  while (id && !seen.has(id)) {
    if (id === ancestor) return true;
    seen.add(id);
    id = categories.get(id)?.parentId ?? null;
  }
  return false;
}

/** Spending against a budget in a period, in the budget's currency. */
export function spent(budget: Budget, txns: Txn[], period: Period, converter: Converter, accounts: Map<string, Account>, categories: Map<string, Category>): number | null {
  const matching = txns.filter(
    (t) => t.kind === 'expense' && inPeriod(period)(t) && (budget.categoryId === null || isWithin(t.categoryId, budget.categoryId, categories)),
  );
  return converter.convert(totals(matching, converter, accounts).expense, converter.base, budget.currency);
}

export interface CardStatement {
  /** Last millisecond covered by the most recently closed statement. */
  closeDate: number;
  nextCloseDate: number;
  dueDate: number;
  statementAmount: number;
  remaining: number;
  newCharges: number;
}

/** A day of a month, clamped so day 31 means the last day of shorter months. */
export function clampedDay(day: number, year: number, month: number): Date {
  const length = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(Math.max(day, 1), length));
}

export function cardStatement(card: Account, txns: Txn[], now = Date.now()): CardStatement {
  const today = new Date(now);
  const y = today.getFullYear();
  const m = today.getMonth();
  // The statement day belongs to the cycle, so it closes only once that day is over.
  const offset = clampedDay(card.statementDay, y, m) >= new Date(y, m, today.getDate()) ? -1 : 0;
  const close = clampedDay(card.statementDay, y, m + offset);
  const nextClose = clampedDay(card.statementDay, y, m + offset + 1);
  const closeEnd = +new Date(close.getFullYear(), close.getMonth(), close.getDate() + 1) - 1;
  let due = clampedDay(card.paymentDay, close.getFullYear(), close.getMonth());
  if (due <= close) due = clampedDay(card.paymentDay, close.getFullYear(), close.getMonth() + 1);

  const statementAmount = Math.max(0, -balance(card, txns, closeEnd));
  let paid = 0;
  let newCharges = 0;
  for (const t of txns) {
    if (t.date <= closeEnd || t.date > now) continue;
    if (t.kind === 'transfer' && t.toAccountId === card.id) paid += t.toAmount;
    if (t.accountId === card.id) {
      if (t.kind === 'income') paid += t.amount;
      else newCharges += t.amount;
    }
  }
  return { closeDate: closeEnd, nextCloseDate: +nextClose, dueDate: +due, statementAmount, remaining: Math.max(0, statementAmount - paid), newCharges };
}
