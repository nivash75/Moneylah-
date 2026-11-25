export type TxnKind = 'expense' | 'income' | 'transfer';
export type AccountKind = 'cash' | 'bank' | 'card' | 'savings' | 'investment' | 'loan' | 'other';
export const TXN_KINDS: TxnKind[] = ['expense', 'income', 'transfer'];
export const ACCOUNT_KINDS: AccountKind[] = ['cash', 'bank', 'card', 'savings', 'investment', 'loan', 'other'];

export interface Account {
  id: string;
  name: string;
  kind: AccountKind;
  currency: string;
  /** Amounts everywhere are integers in the currency's minor units. */
  opening: number;
  includeInTotal: boolean;
  archived: boolean;
  statementDay: number;
  paymentDay: number;
  creditLimit: number;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  kind: 'expense' | 'income';
  parentId: string | null;
  order: number;
}

export interface Txn {
  id: string;
  kind: TxnKind;
  /** Milliseconds since the epoch. */
  date: number;
  /** Positive, in the source account's currency. */
  amount: number;
  /** Transfers only: amount received, in the destination account's currency. */
  toAmount: number;
  /** Value in `baseCurrency` when entered, so history doesn't move with rates. */
  baseAmount: number;
  baseCurrency: string;
  note: string;
  accountId: string;
  toAccountId: string | null;
  categoryId: string | null;
}

export interface Budget {
  id: string;
  /** Monthly limit. */
  amount: number;
  currency: string;
  /** null means all spending. */
  categoryId: string | null;
}

/** 1 unit of `id` (a currency code) is worth `rate` units of `base`. */
export interface Rate {
  id: string;
  base: string;
  rate: number;
}

export interface Settings {
  baseCurrency: string;
  lockEnabled: boolean;
  hideWidgetAmounts: boolean;
}

export interface State {
  accounts: Account[];
  categories: Category[];
  txns: Txn[];
  budgets: Budget[];
  rates: Rate[];
  settings: Settings;
}
