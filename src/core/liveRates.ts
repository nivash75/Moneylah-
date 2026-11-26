import type { Rate, State } from './types.ts';

/** Free daily rates, no account needed. Only the main currency code is sent. */
export const ratesUrl = (base: string) => `https://open.er-api.com/v6/latest/${encodeURIComponent(base)}`;

/** Every other currency the records use. */
export function foreignCurrencies(state: State): string[] {
  const used = [...state.accounts.map((a) => a.currency), ...state.budgets.map((b) => b.currency), ...state.rates.map((r) => r.id)];
  return [...new Set(used)].filter((c) => c !== state.settings.baseCurrency).sort();
}

/** Reads the service's reply, which says what 1 `base` is worth, into rates for `codes`. */
export function parseRates(reply: unknown, base: string, codes: string[]): Rate[] {
  const data = reply as { result?: unknown; base_code?: unknown; rates?: Record<string, unknown> } | null;
  if (data?.result !== 'success' || data.base_code !== base || typeof data.rates !== 'object' || !data.rates) throw new Error('The rate service sent an unexpected reply.');
  const out: Rate[] = [];
  for (const id of codes) {
    const perBase = data.rates[id];
    if (typeof perBase === 'number' && Number.isFinite(perBase) && perBase > 0) out.push({ id, base, rate: Number((1 / perBase).toPrecision(10)) });
  }
  return out;
}
