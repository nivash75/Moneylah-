import type { AccountKind } from '../core/types';

const INFO: Record<AccountKind, [string, string]> = {
  cash: ['Cash', 'cash'],
  bank: ['Bank', 'business'],
  card: ['Credit card', 'card'],
  savings: ['Savings', 'lock-closed'],
  investment: ['Investment', 'trending-up'],
  loan: ['Loan', 'receipt'],
  other: ['Other', 'file-tray'],
};
export const accountTitle = (kind: AccountKind) => INFO[kind][0];
export const accountIcon = (kind: AccountKind) => INFO[kind][1];
