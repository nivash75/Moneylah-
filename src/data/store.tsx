import { createContext, use, useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { Alert } from 'react-native';
import { getLocales } from 'expo-localization';
import type { State } from '../core/types';
import { demoState, initialState } from '../core/seed';
import { byId, converterFor } from '../core/ledger';
import { loadState, saveState } from './db';
import { addExtraCategories } from './extraCategories';

function firstState(): State {
  const stored = loadState();
  const currency = getLocales()[0]?.currencyCode ?? 'USD';
  const loaded = stored ?? (__DEV__ && process.env.EXPO_PUBLIC_DEMO === '1' ? demoState(currency) : initialState(currency));
  const state = addExtraCategories(loaded);
  if (state !== stored) saveState(stored, state);
  return state;
}

type Update = (change: (state: State) => State) => boolean;
const Context = createContext<{ state: State; update: Update } | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(firstState);
  const current = useRef(state);
  /** Saves first, so the screen never shows data that isn't on disk. */
  const update = useCallback<Update>((change) => {
    const next = change(current.current);
    if (next === current.current) return true;
    try {
      saveState(current.current, next);
    } catch (error) {
      Alert.alert('Could not save', error instanceof Error ? error.message : String(error));
      return false;
    }
    current.current = next;
    setState(next);
    return true;
  }, []);
  const value = useMemo(() => ({ state, update }), [state, update]);
  return <Context value={value}>{children}</Context>;
}

export function useStore() {
  const store = use(Context);
  if (!store) throw new Error('useStore needs StoreProvider');
  return store;
}

/** State plus the lookups most screens need. */
export function useLedger() {
  const { state, update } = useStore();
  const lookups = useMemo(
    () => ({ accounts: byId(state.accounts), categories: byId(state.categories), converter: converterFor(state) }),
    [state],
  );
  return { state, update, ...lookups };
}
