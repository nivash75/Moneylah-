import type { Account, Category, State, Txn, TxnKind } from './types.ts';

const EXPENSE: [string, string, string[]][] = [
  ['Food', 'restaurant', ['Groceries', 'Dining out']],
  ['Transport', 'bus', ['Public transport', 'Taxi', 'Fuel']],
  ['Home', 'home', ['Rent', 'Utilities']],
  ['Shopping', 'bag', []],
  ['Health', 'medkit', []],
  ['Entertainment', 'film', []],
  ['Education', 'book', []],
  ['Travel', 'airplane', []],
  ['Other', 'ellipsis-horizontal-circle', []],
];
const INCOME: [string, string][] = [['Salary', 'briefcase'], ['Bonus', 'star'], ['Interest', 'trending-up'], ['Other income', 'add-circle']];

export function account(id: string, name: string, kind: Account['kind'], currency: string, opening = 0): Account {
  return { id, name, kind, currency, opening, includeInTotal: true, archived: false, statementDay: 1, paymentDay: 15, creditLimit: 0 };
}

export function initialState(currency: string): State {
  const categories: Category[] = [];
  EXPENSE.forEach(([name, icon, children], order) => {
    const id = `expense.${name}`;
    categories.push({ id, name, icon, kind: 'expense', parentId: null, order });
    children.forEach((child, i) => categories.push({ id: `${id}.${child}`, name: child, icon, kind: 'expense', parentId: id, order: i }));
  });
  INCOME.forEach(([name, icon], order) => categories.push({ id: `income.${name}`, name, icon, kind: 'income', parentId: null, order }));
  return {
    accounts: [account('account.cash', 'Cash', 'cash', currency), account('account.bank', 'Bank', 'bank', currency)],
    categories,
    txns: [],
    budgets: [],
    rates: [],
    settings: { baseCurrency: currency, lockEnabled: false, hideWidgetAmounts: false },
  };
}

/** Realistic sample records for trying the app out (development builds only). */
export function demoState(currency: string, now = Date.now()): State {
  const state = initialState(currency);
  const unit = 10 ** (currency === 'JPY' || currency === 'KRW' || currency === 'VND' ? 0 : 2);
  const [cash, bank] = state.accounts;
  cash.opening = 200 * unit;
  bank.opening = 4200 * unit;
  const card: Account = { ...account('demo.card', 'Visa', 'card', currency), statementDay: 10, paymentDay: 28, creditLimit: 5000 * unit };
  state.accounts.push(card);
  const today = new Date(now);
  let n = 0;
  const add = (kind: TxnKind, daysAgo: number, value: number, accountId: string, categoryId: string | null, note: string) => {
    const date = +new Date(today.getFullYear(), today.getMonth(), today.getDate() - daysAgo, 12);
    const minor = Math.round(value * unit);
    const t: Txn = { id: `demo.${n++}`, kind, date, amount: minor, toAmount: 0, baseAmount: minor, baseCurrency: currency, note, accountId, toAccountId: null, categoryId };
    state.txns.push(t);
  };
  for (let month = 0; month < 6; month++) {
    const d = month * 30;
    add('income', d + 20, 3800, bank.id, 'income.Salary', 'Monthly pay');
    add('expense', d + 18, 1200, bank.id, 'expense.Home.Rent', 'Rent');
    add('expense', d + 14, 84.5 + month * 9, card.id, 'expense.Food.Groceries', 'Supermarket');
    add('expense', d + 9, 62 + month * 4, card.id, 'expense.Shopping', 'Household items');
    add('expense', d + 5, 23, cash.id, 'expense.Transport.Public transport', 'Travel card top-up');
  }
  add('expense', 0, 12.8, cash.id, 'expense.Food.Dining out', 'Lunch');
  add('expense', 1, 45, card.id, 'expense.Entertainment', 'Cinema');
  add('expense', 2, 99.9, card.id, 'expense.Health', 'Pharmacy');
  state.budgets = [
    { id: 'demo.b0', amount: 2500 * unit, currency, categoryId: null },
    { id: 'demo.b1', amount: 150 * unit, currency, categoryId: 'expense.Food' },
    { id: 'demo.b2', amount: 100 * unit, currency, categoryId: 'expense.Shopping' },
  ];
  return state;
}
