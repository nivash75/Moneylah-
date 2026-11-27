import { test } from 'node:test';
import assert from 'node:assert/strict';
import { convertAt, digits, format, makeConverter, parseAmount, plain, rateBetween } from '../src/core/money.ts';
import { balance, breakdown, byId, cardStatement, cashInHand, converterFor, endOfDay, forecast, inPeriod, periodDays, periodOf, previousComparable, shift, spent, totals } from '../src/core/ledger.ts';
import { accountInUse, removeAccount, removeCategory, upsert } from '../src/core/actions.ts';
import { foreignCurrencies, parseRates } from '../src/core/liveRates.ts';
import { addBillCategories } from '../src/core/billCategories.ts';
import { crc32 as zlibCrc } from 'node:zlib';
import { crc32, zip } from '../src/core/zip.ts';
import { columnName, serialDate, toXlsx, xmlText } from '../src/core/xlsx.ts';
import { toSheets } from '../src/core/excel.ts';
import { dueReminders, isOverdue, loanStatus } from '../src/core/loans.ts';
import { appsScript, isScriptUrl, sheetsData } from '../src/core/googleSheets.ts';
import { csvField, localDay, toCsv } from '../src/core/csv.ts';
import { fromBackup, toBackup } from '../src/core/backup.ts';
import { account, demoState, initialState } from '../src/core/seed.ts';
import type { Txn } from '../src/core/types.ts';
import { changeCurrency, otherCurrencies, toSingleCurrency } from '../src/core/singleCurrency.ts';

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

test('parseAmount rejects misplaced grouping marks instead of dropping them', () => {
  assert.equal(parseAmount('1,234,567', 'SGD'), 123456700);
  assert.equal(parseAmount('12,34,567.50', 'INR'), 123456750);
  assert.equal(parseAmount('-1,250', 'SGD'), -125000);
  assert.equal(parseAmount('1.234.567,5', 'EUR', ','), 123456750);
  for (const bad of ['12,50', '1,5', '0,500', ',500', '1,,000', '1,000,', '12,3456', '1.000,5']) {
    assert.equal(parseAmount(bad, 'SGD'), null, bad);
  }
  for (const bad of ['12.50', '1.5', '1,000.5']) {
    assert.equal(parseAmount(bad, 'EUR', ','), null, bad);
  }
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

test('a typed exchange rate converts both ways', () => {
  // 1 SGD = 63 INR: ₹50.00 is $0.79, and $10.00 is ₹630.00.
  assert.equal(convertAt(5000, 'INR', 'SGD', 'SGD', 63), 79);
  assert.equal(convertAt(1000, 'SGD', 'INR', 'SGD', 63), 63000);
  assert.equal(convertAt(1000, 'JPY', 'SGD', 'SGD', 110), 909);
  assert.equal(rateBetween(1000, 'SGD', 63000, 'INR'), 63);
  for (const bad of [0, -1, NaN, Infinity]) assert.equal(convertAt(5000, 'INR', 'SGD', 'SGD', bad), null);
});

test('downloaded rates are validated and stored as the value of 1 foreign unit', () => {
  const reply = { result: 'success', base_code: 'SGD', rates: { INR: 72, USD: 0.8, BAD: -1 } };
  const rates = parseRates(reply, 'SGD', ['INR', 'USD', 'BAD', 'XXX']);
  assert.deepEqual(rates.map((r) => r.id), ['INR', 'USD']);
  assert.equal(makeConverter('SGD', rates).convert(1000, 'SGD', 'INR'), 72000);
  for (const bad of [null, {}, { ...reply, result: 'error' }, { ...reply, base_code: 'USD' }]) assert.throws(() => parseRates(bad, 'SGD', ['INR']), /unexpected reply/);
  const s = initialState('SGD');
  assert.deepEqual(foreignCurrencies(s), []);
  s.accounts.push(account('sbi', 'SBI', 'bank', 'INR'));
  assert.deepEqual(foreignCurrencies(s), ['INR']);
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

test('monthly cycles reset on the chosen day', () => {
  const cycle = (date: number, start: number) => periodOf('month', date, 1, start);
  const p = cycle(day(2026, 11, 24, 23), 25);
  assert.equal(p.start, day(2026, 10, 25, 0));
  assert.equal(p.end, day(2026, 11, 25, 0));
  assert.equal(cycle(day(2026, 11, 25, 0), 25).start, day(2026, 11, 25, 0));
  assert.equal(cycle(day(2027, 1, 3), 25).start, day(2026, 12, 25, 0));
  assert.equal(shift(p, 2).start, day(2026, 12, 25, 0));
  // Day 31 falls on the last day of shorter months, then returns to the 31st.
  const jan = cycle(day(2026, 2, 27), 31);
  assert.deepEqual([jan.start, jan.end], [day(2026, 1, 31, 0), day(2026, 2, 28, 0)]);
  const feb = shift(jan, 1);
  assert.deepEqual([feb.start, feb.end], [day(2026, 2, 28, 0), day(2026, 3, 31, 0)]);
  assert.equal(shift(feb, 1).start, day(2026, 3, 31, 0));
  assert.equal(shift(feb, -1).start, jan.start);
});

test('projection repeats what followed in earlier periods instead of multiplying bills', () => {
  const s = initialState('SGD');
  const run = (list: Txn[], now: number) => forecast(list, () => true, periodOf('month', now), now, converterFor(s), byId(s.accounts));
  const spend = (id: string, amount: number, date: number) => txn(id, { amount, baseAmount: amount, date });
  // No earlier month: 10 days at 100 a day extends to 30 days.
  const fresh = run([spend('a', 1000, day(2026, 11, 1))], day(2026, 11, 10));
  assert.deepEqual(fresh, { spent: 1000, projected: 3000, daysLeft: 21, history: 0 });
  // Rent on the 1st is not repeated; spending after the 10th in October is.
  const list = [spend('r1', 100000, day(2026, 10, 1)), spend('o', 5000, day(2026, 10, 20)), spend('r2', 100000, day(2026, 11, 1))];
  assert.deepEqual(run(list, day(2026, 11, 10)), { spent: 100000, projected: 105000, daysLeft: 21, history: 1 });
  // A larger expense already entered for later raises the estimate, and counts as spent.
  const later = run([...list, spend('p', 8000, day(2026, 11, 28))], day(2026, 11, 10));
  assert.deepEqual([later.spent, later.projected], [108000, 108000]);
  assert.equal(run(list, day(2026, 11, 30)).projected, 100000);
  assert.equal(run([], day(2026, 11, 10)).projected, 0);
});

test('comparisons use the same number of days while a period is running', () => {
  const november = periodOf('month', day(2026, 11, 10));
  assert.deepEqual(periodDays(november, day(2026, 11, 10)), { total: 30, elapsed: 10 });
  assert.equal(previousComparable(november, day(2026, 11, 10)).end, day(2026, 10, 11, 0));
  assert.equal(previousComparable(november, day(2027, 1, 1)).end, day(2026, 11, 1, 0));
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

test("today's balance counts all of today and nothing dated later", () => {
  const cash = initialState('SGD').accounts[0];
  const today = endOfDay(day(2026, 11, 26, 9));
  const list = [txn('1', { date: day(2026, 11, 26, 23) }), txn('2', { date: day(2026, 11, 27, 0) })];
  assert.equal(balance(cash, list, today), -1000);
});

test('repayments settle the oldest loans first and reminders follow what is still open', () => {
  const s = initialState('SGD');
  const alex = account('alex', 'Alex', 'person', 'SGD');
  s.accounts.push(alex);
  const move = (id: string, from: string, to: string, amount: number, date: number, over: Partial<Txn> = {}) =>
    txn(id, { kind: 'transfer', accountId: from, toAccountId: to, amount, toAmount: amount, date, ...over });
  s.txns = [
    move('a', 'account.bank', 'alex', 5000, day(2026, 11, 1), { loan: 'lend', dueDate: day(2026, 11, 20, 0) }),
    move('b', 'account.bank', 'alex', 3000, day(2026, 11, 10), { loan: 'lend', dueDate: day(2026, 12, 5, 0) }),
    move('r', 'alex', 'account.bank', 6000, day(2026, 11, 15), { loan: 'repayment' }),
  ];
  const now = day(2026, 11, 27);
  const status = loanStatus(alex, s.txns, now);
  assert.equal(status.balance, 2000);
  assert.deepEqual(status.open.map((d) => [d.txnId, d.amount]), [['b', 2000]]);
  const [reminder] = dueReminders(s, false, now);
  assert.equal(reminder.at, day(2026, 12, 5, 9));
  assert.match(reminder.body, /Alex should return .*20\.00/);
  assert.doesNotMatch(JSON.stringify(dueReminders(s, true, now)), /Alex|20\.00/);
  assert.equal(dueReminders(s, false, day(2026, 12, 5, 10)).length, 0);
  assert.ok(isOverdue(day(2026, 11, 20, 0), now) && !isOverdue(day(2026, 11, 27, 0), now));
  // Lending is a transfer, so it is neither income nor spending, and money in hand goes down.
  assert.deepEqual(totals(s.txns, converterFor(s), byId(s.accounts)), { income: 0, expense: 0, unconverted: 0 });
  assert.equal(cashInHand(s, converterFor(s), now).amount, -2000);
  assert.deepEqual(fromBackup(toBackup(s)), s);
});

test('borrowed money is owed back and adds to money in hand', () => {
  const s = initialState('SGD');
  const sam = account('sam', 'Sam', 'person', 'SGD');
  s.accounts.push(sam, account('card', 'Visa', 'card', 'SGD', -700), account('eur', 'Euro', 'cash', 'EUR', 100));
  s.txns = [txn('a', { kind: 'transfer', accountId: 'sam', toAccountId: 'account.cash', amount: 4000, toAmount: 4000, loan: 'borrow' })];
  const now = day(2026, 11, 27);
  assert.equal(loanStatus(sam, s.txns, now).balance, -4000);
  assert.equal(loanStatus(sam, s.txns, now).open[0].dueDate, null);
  assert.deepEqual(cashInHand(s, converterFor(s), now), { amount: 4000, unconverted: 1 });
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

test('bill categories are added once, reusing ones the user already has', () => {
  const start = initialState('SGD');
  start.categories.push({ id: 'mine', name: 'bills', icon: 'star', kind: 'expense', parentId: null, order: 99 });
  const added = addBillCategories(start);
  const named = (name: string) => added.categories.filter((c) => c.name.toLowerCase() === name.toLowerCase());
  assert.deepEqual(named('Bills').map((c) => [c.id, c.icon]), [['mine', 'star']]);
  assert.equal(named('Broadband')[0].parentId, 'mine');
  assert.equal(named('EZ-Link pass')[0].parentId, 'expense.Transport');
  assert.equal(named('Transport').length, 1);
  assert.equal(new Set(added.categories.map((c) => c.id)).size, added.categories.length);
  assert.deepEqual(added.txns, start.txns);
  // Deleted categories stay deleted, including after a backup and restore.
  const trimmed = removeCategory(added, 'mine');
  assert.equal(addBillCategories(trimmed), trimmed);
  const restored = fromBackup(toBackup(trimmed));
  assert.equal(addBillCategories(restored), restored);
  // A later addition reaches earlier users without bringing back what they deleted.
  const earlier = { ...trimmed, categories: trimmed.categories.filter((c) => c.name !== 'GrabPayLater'), settings: { ...trimmed.settings, categorySet: 1 } };
  const updated = addBillCategories(earlier);
  assert.deepEqual(updated.categories.slice(earlier.categories.length).map((c) => [c.name, c.parentId]), [['GrabPayLater', 'expense.Installments']]);
});

test('spreadsheet helpers produce valid names, dates, text and checksums', () => {
  assert.deepEqual([0, 25, 26, 51, 52].map(columnName), ['A', 'Z', 'AA', 'AZ', 'BA']);
  assert.equal(serialDate(day(2026, 1, 1)), 46023.5);
  assert.equal(xmlText('a<b>&"c"\u0001\uD800 😀'), 'a&lt;b&gt;&amp;&quot;c&quot; 😀');
  const bytes = new TextEncoder().encode('Moneylah! ₹');
  assert.equal(crc32(bytes), zlibCrc(bytes));
  const archive = zip([{ name: 'a.txt', text: 'hi' }]);
  const view = new DataView(archive.buffer);
  assert.equal(view.getUint32(0, true), 0x04034b50);
  assert.equal(view.getUint32(archive.length - 22, true), 0x06054b50);
});

test('the Excel export holds transactions, cycle totals and balances', () => {
  const s = demoState('SGD', day(2026, 11, 26));
  s.txns[0].note = '=1+1';
  const [txns, months, accounts] = toSheets(s, day(2026, 11, 26));
  assert.equal(txns.rows.length, s.txns.length);
  assert.ok(txns.rows.some((r) => r[11] === '=1+1'));
  assert.equal(accounts.rows.length, s.accounts.length);
  const spentInSheet = months.rows.reduce((a, r) => a + (r[3] as { value: number }).value, 0);
  const spentInApp = totals(s.txns, converterFor(s), byId(s.accounts)).expense / 100;
  assert.ok(Math.abs(spentInSheet - spentInApp) < 0.001);
  assert.ok(toXlsx([txns, months, accounts]).length > 1000);
  assert.equal(toSheets(initialState('SGD'))[1].rows.length, 0);
});

test('Google Sheets data is plain values, with formulas neutralised and only script links accepted', () => {
  const s = demoState('SGD', day(2026, 11, 26));
  s.txns[0].note = '=IMPORTXML("http://x")';
  const [txns] = sheetsData(s, day(2026, 11, 26));
  assert.equal(txns.name, 'Moneylah Transactions');
  assert.equal(txns.rows.length, s.txns.length + 1);
  assert.ok(txns.rows.every((r) => r.length === txns.rows[0].length && r.every((v) => typeof v === 'string' || typeof v === 'number')));
  assert.ok(txns.rows.some((r) => r.includes(`'=IMPORTXML("http://x")`)));
  assert.ok(isScriptUrl('https://script.google.com/macros/s/AKfy_c-1/exec'));
  for (const bad of ['http://script.google.com/macros/s/a/exec', 'https://script.google.com.evil.com/macros/s/a/exec', 'https://evil.com/macros/s/a/exec', 'https://script.google.com/macros/s/a/dev']) assert.ok(!isScriptUrl(bad), bad);
  // The script has to be valid JavaScript.
  assert.doesNotThrow(() => new Function(appsScript('abc123')));
});

test('file dates follow the local day, even just after midnight', () => {
  assert.equal(localDay(day(2026, 11, 26, 0)), '2026-11-26');
  assert.equal(localDay(day(2027, 1, 5, 23)), '2027-01-05');
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
  const old = JSON.parse(toBackup(s));
  delete old.state.settings.cycleDay;
  assert.equal(fromBackup(JSON.stringify(old)).settings.cycleDay, 1);
  const broken = (mutate: (f: any) => void) => { const f = JSON.parse(toBackup(s)); mutate(f); return JSON.stringify(f); };
  assert.throws(() => fromBackup('nope'), /not valid JSON/);
  assert.throws(() => fromBackup(broken((f) => (f.state.settings.cycleDay = 32))), /bad settings/);
  assert.throws(() => fromBackup('{}'), /not a Moneylah! backup/);
  assert.throws(() => fromBackup(broken((f) => (f.version = 9))), /unsupported/);
  assert.throws(() => fromBackup(broken((f) => (f.state.txns[0].amount = 1.5))), /bad amount/);
  assert.throws(() => fromBackup(broken((f) => (f.state.txns[0].accountId = 'ghost'))), /missing/);
  assert.throws(() => fromBackup(broken((f) => f.state.accounts.push(f.state.accounts[0]))), /duplicate/);
  assert.throws(() => fromBackup(broken((f) => (f.state.categories[0].parentId = f.state.categories[0].id))), /category tree/);
});

test('changing the only currency keeps the numbers, and mixed currencies are left alone', () => {
  const start = demoState('USD');
  assert.deepEqual(otherCurrencies(start), []);
  assert.equal(toSingleCurrency(start), start);
  const yen = changeCurrency(start, 'JPY');
  assert.deepEqual(otherCurrencies(yen), []);
  assert.equal(yen.settings.baseCurrency, 'JPY');
  assert.equal(yen.accounts[0].opening, start.accounts[0].opening / 100);
  assert.ok(yen.txns.every((t) => t.baseCurrency === 'JPY' && t.baseAmount === t.amount));
  assert.equal(changeCurrency(yen, 'USD').accounts[0].opening, start.accounts[0].opening);

  const mixed = { ...start, accounts: [...start.accounts, account('rupees', 'Rupees', 'bank', 'INR')] };
  assert.deepEqual(otherCurrencies(mixed), ['INR']);
  assert.equal(changeCurrency(mixed, 'SGD'), mixed);
  assert.equal(toSingleCurrency(mixed), null);

  // Only the main currency differs: the amounts are in the accounts' currency, so that one wins.
  const relabelled = toSingleCurrency({ ...start, settings: { ...start.settings, baseCurrency: 'INR' } });
  assert.equal(relabelled?.settings.baseCurrency, 'USD');
  assert.equal(relabelled?.accounts[0].opening, start.accounts[0].opening);

  // With nothing recorded, the chosen main currency wins.
  const empty = initialState('USD');
  const chosen = toSingleCurrency({ ...empty, settings: { ...empty.settings, baseCurrency: 'INR' } });
  assert.ok(chosen?.accounts.every((a) => a.currency === 'INR'));
});
