import type { State } from './types.ts';
import { digits } from './money.ts';
import { balance, byId, converterFor, endOfDay, inPeriod, periodOf, shift, totals } from './ledger.ts';
import type { Cell, Sheet } from './xlsx.ts';

const money = (minor: number | null, code: string): Cell => (minor === null ? null : { value: minor / 10 ** digits(code), decimals: digits(code) });
const capital = (word: string) => word.charAt(0).toUpperCase() + word.slice(1);

/** Transactions, a summary of each monthly cycle, and account balances. */
export function toSheets(state: State, now = Date.now()): Sheet[] {
  const accounts = byId(state.accounts);
  const categories = byId(state.categories);
  const converter = converterFor(state);
  const base = converter.base;
  const txns = [...state.txns].sort((a, b) => a.date - b.date);

  const transactions = txns.map((t): Cell[] => {
    const from = accounts.get(t.accountId);
    const to = t.toAccountId ? accounts.get(t.toAccountId) : undefined;
    const code = from?.currency ?? t.baseCurrency;
    const node = t.categoryId ? categories.get(t.categoryId) : undefined;
    const parent = node?.parentId ? categories.get(node.parentId) : undefined;
    return [
      { date: t.date }, capital(t.kind), from?.name ?? '', to?.name ?? '', (parent ?? node)?.name ?? '', parent ? node!.name : '',
      money(t.amount, code), code, to ? money(t.toAmount, to.currency) : null, to?.currency ?? '',
      // Transfers move money between accounts, so they carry no income or spending value.
      t.kind === 'transfer' ? null : money(converter.valueOf(t, accounts), base), t.note,
      t.loan ? capital(t.loan) : '', t.dueDate ? { day: t.dueDate } : null,
    ];
  });

  const months: Cell[][] = [];
  if (txns.length) {
    const last = txns[txns.length - 1].date;
    for (let p = periodOf('month', txns[0].date, 1, state.settings.cycleDay); p.start <= Math.max(last, now); p = shift(p, 1)) {
      const sum = totals(txns.filter(inPeriod(p)), converter, accounts);
      months.push([{ day: p.start }, { day: p.end - 1 }, money(sum.income, base), money(sum.expense, base), money(sum.income - sum.expense, base), sum.unconverted ? `${sum.unconverted} left out: exchange rate missing` : '']);
    }
  }

  const balances = state.accounts.map((a): Cell[] => {
    const value = balance(a, txns, endOfDay(now));
    return [a.name, capital(a.kind), a.currency, money(value, a.currency), money(converter.convert(value, a.currency), base), a.includeInTotal ? 'Yes' : 'No', a.archived ? 'Yes' : 'No'];
  });

  const column = (title: string, width = 14) => ({ title, width });
  return [
    { name: 'Transactions', columns: [column('Date', 18), column('Type', 10), column('Account'), column('To account'), column('Category', 16), column('Subcategory', 18), column('Amount'), column('Currency', 10), column('Received'), column('Received currency', 18), column(`Value (${base})`), column('Note', 30), column('Loan', 12), column('Due date')], rows: transactions },
    { name: 'Monthly summary', columns: [column('From'), column('To'), column(`Income (${base})`, 16), column(`Expense (${base})`, 16), column(`Net (${base})`), column('Remarks', 36)], rows: months },
    { name: 'Accounts', columns: [column('Account', 18), column('Type'), column('Currency', 10), column('Balance today', 16), column(`Value (${base})`), column('In net worth', 14), column('Archived', 10)], rows: balances },
  ];
}
