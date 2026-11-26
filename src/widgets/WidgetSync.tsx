import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { format } from '../core/money';
import { inPeriod, periodOf, shift, spent, totals } from '../core/ledger';
import { useLedger } from '../data/store';
import { periodTitle } from '../ui/periods';
import MonthWidget from './MonthWidget';

/** Pushes the current cycle's summary to the home screen widget whenever the data changes. */
export function WidgetSync() {
  const { state, accounts, categories, converter } = useLedger();
  const [activations, setActivations] = useState(0);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') setActivations((n) => n + 1); });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    const month = periodOf('month', Date.now(), 1, state.settings.cycleDay);
    const sum = totals(state.txns.filter(inPeriod(month)), converter, accounts);
    const overall = state.budgets.find((b) => b.categoryId === null);
    const used = overall ? spent(overall, state.txns, month, converter, accounts, categories) : null;
    const hide = state.settings.hideWidgetAmounts;
    const money = (value: number) => (hide ? '••••' : format(value, converter.base));
    const next = shift(month, 1);
    try {
      MonthWidget.updateTimeline([
        { date: new Date(), props: { title: periodTitle(month), income: money(sum.income), expense: money(sum.expense), budget: !hide && overall && used !== null && overall.amount > 0 ? used / overall.amount : -1 } },
        // Start the new cycle at zero even if the app isn't opened.
        { date: new Date(next.start), props: { title: periodTitle(next), income: money(0), expense: money(0), budget: -1 } },
      ]);
    } catch (error) {
      console.warn('Widget update failed', error);
    }
  }, [state, accounts, categories, converter, activations]);

  return null;
}
