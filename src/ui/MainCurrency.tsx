import { CURRENCIES } from '../core/money';
import { canChangeCurrency, changeCurrency, otherCurrencies } from '../core/singleCurrency';
import { useStore } from '../data/store';
import { Card, Chips, confirm, Note, Screen } from './kit';

/** Chooses the app's only currency. */
export function MainCurrency() {
  const { state, update } = useStore();
  const base = state.settings.baseCurrency;
  const others = otherCurrencies(state);
  const fixed = !canChangeCurrency(state);

  const choose = (code: string) => {
    if (code === base && !others.length) return;
    confirm(`Use ${code}?`, 'Your amounts keep the same numbers. Nothing is converted.', 'Switch', () => { update((s) => changeCurrency(s, code)); });
  };

  return (
    <Screen>
      <Card title="Currency">
        <Chips value={base} onChange={choose} disabled={fixed} options={[...new Set([base, ...CURRENCIES])].map((c) => ({ value: c, label: c }))} />
      </Card>
      <Note>{fixed ? `The currency can't be changed because there are amounts in more than one currency (${others.join(', ')}).` : others.length ? `Some accounts still use ${others.join(', ')}. Tap a currency to use it everywhere.` : 'All accounts use this currency.'}</Note>
    </Screen>
  );
}
