import type { State } from './types.ts';

type Collection = 'accounts' | 'categories' | 'txns' | 'budgets' | 'rates';

export function upsert<K extends Collection>(state: State, key: K, item: State[K][number]): State {
  const list = state[key] as { id: string }[];
  const exists = list.some((i) => i.id === item.id);
  return { ...state, [key]: exists ? list.map((i) => (i.id === item.id ? item : i)) : [...list, item] };
}

export function remove(state: State, key: 'txns' | 'budgets' | 'rates', id: string): State {
  return { ...state, [key]: (state[key] as { id: string }[]).filter((i) => i.id !== id) };
}

export const accountInUse = (state: State, id: string) => state.txns.some((t) => t.accountId === id || t.toAccountId === id);

/** Accounts with history can only be archived, never deleted. */
export function removeAccount(state: State, id: string): State {
  if (accountInUse(state, id)) return state;
  return { ...state, accounts: state.accounts.filter((a) => a.id !== id) };
}

/** Removes a category and its subcategories. Their transactions become uncategorised. */
export function removeCategory(state: State, id: string): State {
  const gone = new Set([id]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const c of state.categories) {
      if (c.parentId && gone.has(c.parentId) && !gone.has(c.id)) { gone.add(c.id); grew = true; }
    }
  }
  return {
    ...state,
    categories: state.categories.filter((c) => !gone.has(c.id)),
    txns: state.txns.map((t) => (t.categoryId && gone.has(t.categoryId) ? { ...t, categoryId: null } : t)),
    budgets: state.budgets.filter((b) => !(b.categoryId && gone.has(b.categoryId))),
  };
}
