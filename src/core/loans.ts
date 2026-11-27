import type { Account, State, Txn } from './types.ts';
import { balance, endOfDay } from './ledger.ts';
import { format } from './money.ts';

export interface Due { txnId: string; amount: number; dueDate: number | null; date: number }

export interface LoanStatus {
  /** In the person's currency: positive means they owe you, negative that you owe them. */
  balance: number;
  /** Loans not yet repaid, soonest due first. Undated ones come last. */
  open: Due[];
}

/** Repayments settle the oldest loans first, so what is still owed belongs to the newest ones. */
export function loanStatus(person: Account, txns: Txn[], now = Date.now()): LoanStatus {
  const upTo = endOfDay(now);
  const total = balance(person, txns, upTo);
  const lent = total > 0;
  let remaining = Math.abs(total);
  const loans = txns
    .filter((t) => t.kind === 'transfer' && t.loan !== 'repayment' && t.date <= upTo && (lent ? t.toAccountId : t.accountId) === person.id)
    .sort((a, b) => b.date - a.date);
  const open: Due[] = [];
  for (const t of loans) {
    if (remaining <= 0) break;
    const amount = Math.min(remaining, lent ? t.toAmount : t.amount);
    remaining -= amount;
    open.push({ txnId: t.id, amount, dueDate: t.dueDate ?? null, date: t.date });
  }
  open.sort((a, b) => (a.dueDate ?? Infinity) - (b.dueDate ?? Infinity) || a.date - b.date);
  return { balance: total, open };
}

export const isOverdue = (dueDate: number, now = Date.now()) => endOfDay(dueDate) < now;

export interface Reminder { id: string; at: number; title: string; body: string }

const REMIND_HOUR = 9;
/** Loans and repayments dated in the future count too, so a reminder exists before the loan date arrives. */
const AHEAD = 20 * 365 * 86_400_000;
/** iOS keeps at most 64 pending notifications per app. */
const LIMIT = 64;

/** A notification at 9 am on each coming due date. `discreet` leaves names and amounts off the lock screen. */
export function dueReminders(state: State, discreet: boolean, now = Date.now()): Reminder[] {
  const out: Reminder[] = [];
  for (const person of state.accounts) {
    if (person.kind !== 'person' || person.archived) continue;
    const status = loanStatus(person, state.txns, now + AHEAD);
    for (const due of status.open) {
      if (due.dueDate === null) continue;
      const at = new Date(due.dueDate).setHours(REMIND_HOUR, 0, 0, 0);
      if (at <= now) continue;
      const amount = format(due.amount, person.currency);
      const body = discreet ? 'Open Moneylah! for the details.' : status.balance > 0 ? `${person.name} should return ${amount} today.` : `Return ${amount} to ${person.name} today.`;
      out.push({ id: `due.${due.txnId}`, at, title: discreet ? 'A loan is due today' : status.balance > 0 ? 'Money due back to you' : 'Money you owe is due', body });
    }
  }
  return out.sort((a, b) => a.at - b.at).slice(0, LIMIT);
}
