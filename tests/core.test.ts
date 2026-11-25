import { test } from 'node:test';
import assert from 'node:assert/strict';
import { digits, format, makeConverter, parseAmount, plain } from '../src/core/money.ts';
import { balance, breakdown, byId, cardStatement, converterFor, inPeriod, periodOf, shift, spent, totals } from '../src/core/ledger.ts';
import { accountInUse, removeAccount, removeCategory, upsert } from '../src/core/actions.ts';
import { csvField, toCsv } from '../src/core/csv.ts';
import { fromBackup, toBackup } from '../src/core/backup.ts';
import { account, demoState, initialState } from '../src/core/seed.ts';
import type { Txn } from '../src/core/types.ts';

const day = (y: number, m: number, d: number, h = 12) => +new Date(y, m - 1, d, h);
const txn = (id: string, over: Partial<Txn>): Txn => ({
  id, kind: 'expense', date: day(2026, 11, 5), amount: 1000, toAmount: 0, baseAmount: 1000, baseCurrency: 'SGD',
  note: '', accountId: 'account.cash', toAccountId: null, categoryId: null, ...over,
});

test('parseAmount accepts good input and rejects junk', () => {
  assert.equal(parseAmount('12.34', 'SGD'), 1234);
  assert.equal(parseAmount('1,234.5', 'SGD'), 123450);
  assert.equal(parseAmount('1.234,50', 'EUR', ','), 123450);
  assert.equal(parseAmount('.5', 'SGD'), 50);
  assert.equal(parseAmount('-3', 'SGD'), -300);
  assert.equal(parseAmount('500', 'JPY'), 500);
  assert.equal(parseAmount('1.234', 'KWD'), 1234);
  for (const bad of ['', '.', '-', 'abc', '12abc', '1.2.3', '1.234', '1e5', '99999999999999999']) {
    assert.equal(parseAmount(bad, 'SGD'), null, bad);
  }
  assert.equal(parseAmount('1.5', 'JPY'), null);
});

test('plain and format respect currency decimals', () => {
  assert.equal(plain(5, 'SGD'), '0.05');
  assert.equal(plain(-123450, 'SGD'), '-1234.50');
  assert.equal(plain(500, 'JPY'), '500');
  assert.equal(digits('KWD'), 3);
  assert.match(format(123450, 'USD', 'en-US'), /1,234\.50/);
});

test('conversion handles direct, inverse and missing rates', () => {
  const c = makeConverter('SGD', [{ id: 'USD', base: 'SGD', rate: 1.25 }, { id: 'SGD', base: 'JPY', rate: 100 }]);
  assert.equal(c.convert(1000, 'USD'), 1250);
  assert.equal(c.convert(1000, 'JPY'), 1000);
  assert.equal(c.convert(1250, 'SGD', 'USD'), 1000);
  assert.equal(c.convert(1000, 'EUR'), null);
  assert.equal(c.convert(1000, 'EUR', 'EUR'), 1000);
});

test('periods are half-open and shift cleanly', () => {
  const p = periodOf('month', day(2026, 1, 31));
  assert.equal(p.start, day(2026, 1, 1, 0));
  assert.ok(!inPeriod(p)(txn('a', { date: p.end })));
  assert.ok(inPeriod(p)(txn('a', { date: p.start })));
  assert.equal(shift(p, 1).start, day(2026, 2, 1, 0));
  assert.equal(periodOf('week', day(2026, 11, 25)).start, day(2026, 11, 23, 0));
  assert.equal(shift(periodOf('week', day(2026, 11, 25)), -1).start, day(2026, 11, 16, 0));
});

test('balances, totals and transfers', () => {
  const s = initialState('SGD');
  const [cash, bank] = s.accounts;
  const list = [
    txn('1', { kind: 'income', amount: 5000, baseAmount: 5000 }),
    txn('2', {}),
    txn('3', { kind: 'transfer', amount: 2000, toAmount: 2000, toAccountId: bank.id }),
  ];
  assert.equal(balance(cash, list), 2000);
  assert.equal(balance(bank, list), 2000);
  assert.deepEqual(totals(list, converterFor(s), byId(s.accounts)), { income: 5000, expense: 1000, unconverted: 0 });
});

test('unknown rates are reported rather than guessed', () => {
  const s = initialState('SGD');
  s.accounts.push(account('eur', 'Euro', 'cash', 'EUR'));
  const t = txn('1', { accountId: 'eur', baseCurrency: 'USD' });
  assert.deepEqual(totals([t], converterFor(s), byId(s.accounts)), { income: 0, expense: 0, unconverted: 1 });
});

test('subcategories roll up into breakdowns and budgets', () => {
  const s = initialState('SGD');
  const cats = byId(s.categories);
  const list = [txn('1', { categoryId: 'expense.Food.Groceries' }), txn('2', { categoryId: 'expense.Food' }), txn('3', { categoryId: 'expense.Shopping' })];
  const slices = breakdown(list, 'expense', converterFor(s), byId(s.accounts), cats);
  assert.deepEqual(slices.map((x) => [x.name, x.amount]), [['Food', 2000], ['Shopping', 1000]]);
  const month = periodOf('month', day(2026, 11, 1));
  const run = (categoryId: string | null) => spent({ id: 'b', amount: 1, currency: 'SGD', categoryId }, list, month, converterFor(s), byId(s.accounts), cats);
  assert.equal(run('expense.Food'), 2000);
  assert.equal(run(null), 3000);
});

test('card statement splits closed amount, payments and new charges', () => {
  const card = { ...account('card', 'Visa', 'card', 'SGD'), statementDay: 10, paymentDay: 28 };
  const list = [
    txn('1', { accountId: 'card', amount: 10000, date: day(2026, 11, 10, 23) }),
    txn('2', { accountId: 'card', amount: 3000, date: day(2026, 11, 11) }),
    txn('3', { kind: 'transfer', amount: 4000, toAmount: 4000, toAccountId: 'card', date: day(2026, 11, 20) }),
  ];
  const s = cardStatement(card, list, day(2026, 11, 25));
  assert.equal(s.statementAmount, 10000);
  assert.equal(s.remaining, 6000);
  assert.equal(s.newCharges, 3000);
  assert.equal(s.dueDate, day(2026, 11, 28, 0));
  assert.equal(s.nextCloseDate, day(2026, 12, 10, 0));
  // On the statement day itself, the cycle is still open.
  assert.equal(new Date(cardStatement(card, list, day(2026, 11, 10)).closeDate).getMonth(), 9);
});

test('card statement clamps short months and rolls the due date over', () => {
  const card = { ...account('card', 'Visa', 'card', 'SGD'), statementDay: 31, paymentDay: 20 };
  const s = cardStatement(card, [], day(2026, 3, 5));
  assert.equal(new Date(s.closeDate).getDate(), 28);
  assert.equal(s.dueDate, day(2026, 3, 20, 0));
  assert.equal(s.nextCloseDate, day(2026, 3, 31, 0));
});

test('deleting accounts and categories keeps data consistent', () => {
  let s = demoState('SGD');
  assert.ok(accountInUse(s, 'account.cash'));
  assert.equal(removeAccount(s, 'account.cash'), s);
  s = removeCategory(s, 'expense.Food');
  assert.ok(!s.categories.some((c) => c.id.startsWith('expense.Food')));
  assert.ok(!s.txns.some((t) => t.categoryId?.startsWith('expense.Food')));
  assert.ok(!s.budgets.some((b) => b.categoryId === 'expense.Food'));
  const renamed = upsert(s, 'accounts', { ...s.accounts[0], name: 'Wallet' });
  assert.equal(renamed.accounts.length, s.accounts.length);
});

test('CSV escapes quotes and neutralises formulas', () => {
  assert.equal(csvField('=1+1'), `"'=1+1"`);
  assert.equal(csvField('say "hi", ok'), '"say ""hi"", ok"');
  const s = demoState('SGD');
  assert.equal(toCsv(s).trim().split('\r\n').length, s.txns.length + 1);
});

test('backup round-trips and rejects damaged files', () => {
  const s = demoState('SGD');
  assert.deepEqual(fromBackup(toBackup(s)), s);
  const broken = (mutate: (f: any) => void) => { const f = JSON.parse(toBackup(s)); mutate(f); return JSON.stringify(f); };
  assert.throws(() => fromBackup('nope'), /not valid JSON/);
  assert.throws(() => fromBackup('{}'), /not a Moneylah! backup/);
  assert.throws(() => fromBackup(broken((f) => (f.version = 9))), /unsupported/);
  assert.throws(() => fromBackup(broken((f) => (f.state.txns[0].amount = 1.5))), /bad amount/);
  assert.throws(() => fromBackup(broken((f) => (f.state.txns[0].accountId = 'ghost'))), /missing/);
  assert.throws(() => fromBackup(broken((f) => f.state.accounts.push(f.state.accounts[0]))), /duplicate/);
  assert.throws(() => fromBackup(broken((f) => (f.state.categories[0].parentId = f.state.categories[0].id))), /category tree/);
});
