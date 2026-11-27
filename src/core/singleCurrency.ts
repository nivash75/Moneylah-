import { digits } from './money.ts';
import type { State } from './types.ts';

const used = (state: State) => [...new Set([...state.accounts, ...state.budgets].map((item) => item.currency))];

/** Currencies in use besides the main one. */
export const otherCurrencies = (state: State) => used(state).filter((code) => code !== state.settings.baseCurrency);

const nothingRecorded = (state: State) => !state.txns.length && !state.budgets.length && state.accounts.every((a) => !a.opening && !a.creditLimit);

/** Real amounts in two or more currencies can't be merged without exchange rates. */
export const canChangeCurrency = (state: State) => used(state).length <= 1 || nothingRecorded(state);

/** Moves everything to one currency, keeping the numbers: nothing is converted. Does nothing to mixed data. */
export function changeCurrency(state: State, code: string): State {
  if ((code === state.settings.baseCurrency && !otherCurrencies(state).length) || !canChangeCurrency(state)) return state;
  // Amounts are stored in the smallest unit, which differs in size between currencies.
  const scale = (minor: number, from: string) => Math.round((minor * 10 ** digits(code)) / 10 ** digits(from));
  const currencyOf = new Map(state.accounts.map((a) => [a.id, a.currency]));
  return {
    ...state,
    accounts: state.accounts.map((a) => ({ ...a, currency: code, opening: scale(a.opening, a.currency), creditLimit: scale(a.creditLimit, a.currency) })),
    txns: state.txns.map((t) => {
      const amount = scale(t.amount, currencyOf.get(t.accountId) ?? code);
      return { ...t, amount, toAmount: scale(t.toAmount, currencyOf.get(t.toAccountId ?? '') ?? code), baseAmount: amount, baseCurrency: code };
    }),
    budgets: state.budgets.map((b) => ({ ...b, currency: code, amount: scale(b.amount, b.currency) })),
    rates: [],
    settings: { ...state.settings, baseCurrency: code, ratesUpdated: 0 },
  };
}

/**
 * Brings data into a single currency: the one its amounts are already in, or the main currency while nothing is recorded.
 * Returns null when it holds amounts in several currencies.
 */
export function toSingleCurrency(state: State): State | null {
  if (!canChangeCurrency(state)) return null;
  const code = nothingRecorded(state) ? state.settings.baseCurrency : (used(state)[0] ?? state.settings.baseCurrency);
  return changeCurrency(state, code);
}
