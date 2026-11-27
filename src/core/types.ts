export type TxnKind = 'expense' | 'income' | 'transfer';
/** A 'person' account tracks money lent to (positive) or borrowed from (negative) someone. */
export type AccountKind = 'cash' | 'bank' | 'card' | 'savings' | 'investment' | 'loan' | 'other' | 'person';
export type LoanKind = 'lend' | 'borrow' | 'repayment';
export const TXN_KINDS: TxnKind[] = ['expense', 'income', 'transfer'];
export const ACCOUNT_KINDS: AccountKind[] = ['cash', 'bank', 'card', 'savings', 'investment', 'loan', 'other', 'person'];

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
  /** Set on transfers to or from a person. */
  loan?: LoanKind;
  /** The day a loan should be returned, at local midnight. */
  dueDate?: number;
}

export interface Budget {
  id: string;
  /** Limit per monthly cycle. */
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
  /** Day of the month (1-31) when monthly totals and budgets reset. */
  cycleDay: number;
  /** Which built-in category additions have been applied. */
  categorySet: number;
  /** Fetch today's exchange rates, replacing saved ones. */
  autoRates: boolean;
  /** When rates were last fetched on this device, or 0. */
  ratesUpdated: number;
  /** When a backup was last saved to a folder from this device, or 0. */
  lastBackup: number;
}

export interface State {
  accounts: Account[];
  categories: Category[];
  txns: Txn[];
  budgets: Budget[];
  rates: Rate[];
  settings: Settings;
}
