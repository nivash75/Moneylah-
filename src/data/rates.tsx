import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { upsert } from '../core/actions';
import { foreignCurrencies, parseRates, ratesUrl } from '../core/liveRates';
import { useStore } from './store';

/** The service publishes once a day; checking a few times a day picks that up. */
const STALE_AFTER = 6 * 3_600_000;
const TIMEOUT = 10_000;

/** Fetches today's rates for the currencies in use and saves them. */
export function useRefreshRates() {
  const { state, update } = useStore();
  const base = state.settings.baseCurrency;
  const codes = foreignCurrencies(state).join(',');

  return useCallback(async () => {
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), TIMEOUT);
    try {
      const response = await fetch(ratesUrl(base), { signal: abort.signal });
      if (!response.ok) throw new Error(`The rate service answered ${response.status}.`);
      const rates = parseRates(await response.json(), base, codes.split(','));
      update((s) => {
        // The main currency or the setting may have changed while waiting.
        if (s.settings.baseCurrency !== base || !s.settings.autoRates) return s;
        const next = rates.reduce((acc, rate) => upsert(acc, 'rates', rate), s);
        return { ...next, settings: { ...next.settings, ratesUpdated: Date.now() } };
      });
    } finally {
      clearTimeout(timer);
    }
  }, [base, codes, update]);
}

/** Keeps rates current while the app is in use. Does nothing when only one currency is used. */
export function RatesSync() {
  const { state } = useStore();
  const refresh = useRefreshRates();
  const [activations, setActivations] = useState(0);
  const latest = useRef(state);
  latest.current = state;

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') setActivations((n) => n + 1); });
    return () => sub.remove();
  }, []);

  const base = state.settings.baseCurrency;
  const codes = foreignCurrencies(state).join(',');
  const { autoRates } = state.settings;
  const never = state.settings.ratesUpdated === 0;

  // Runs on opening the app, after a restore, and when the currencies in use change.
  useEffect(() => {
    if (!autoRates || !codes) return;
    const { settings, rates } = latest.current;
    const missing = codes.split(',').some((code) => !rates.some((r) => r.id === code && r.base === base));
    if (!missing && Date.now() - settings.ratesUpdated < STALE_AFTER) return;
    // Offline or unavailable: the saved rates stay in use.
    refresh().catch((error: unknown) => console.log('Rate update failed', error));
  }, [autoRates, codes, base, never, activations, refresh]);

  return null;
}
