import type { Category, State } from './types.ts';

const VERSION = 2;

/** The version that introduced them, then name, icon and subcategories. A group that already exists only gains subcategories. */
const ADDITIONS: [number, string, string, [string, string][]][] = [
  [1, 'Bills', 'receipt', [['Mobile SIM', 'phone-portrait'], ['Broadband', 'wifi'], ['iCloud', 'cloud'], ['SP utilities', 'flash'], ['Town Council', 'business'], ['HDB rent', 'home']]],
  [1, 'Installments', 'calendar', [['Monitor', 'desktop'], ['AirPods', 'headset'], ['Car loan', 'car']]],
  [1, 'Investment', 'trending-up', []],
  [1, 'Transport', 'bus', [['EZ-Link pass', 'train']]],
  [2, 'Installments', 'calendar', [['GrabPayLater', 'card']]],
];

/**
 * Adds each bill and installment category once, so ones deleted later stay deleted.
 * Categories the user already has under the same name are reused, not duplicated or changed.
 */
export function addBillCategories(state: State): State {
  if (state.settings.categorySet >= VERSION) return state;
  const categories = [...state.categories];
  const ensure = (name: string, icon: string, parent: Category | null): Category => {
    const parentId = parent?.id ?? null;
    const id = parent ? `${parent.id}.${name}` : `expense.${name}`;
    const found = categories.find((c) => c.id === id || (c.kind === 'expense' && c.parentId === parentId && c.name.trim().toLowerCase() === name.toLowerCase()));
    if (found) return found;
    const added: Category = { id, name, icon, kind: 'expense', parentId, order: categories.length };
    categories.push(added);
    return added;
  };
  for (const [version, name, icon, children] of ADDITIONS) {
    if (version <= state.settings.categorySet) continue;
    const group = ensure(name, icon, null);
    // A matching category that was moved under another one can't hold subcategories.
    if (group.parentId) continue;
    for (const [child, childIcon] of children) ensure(child, childIcon, group);
  }
  return { ...state, categories, settings: { ...state.settings, categorySet: VERSION } };
}
