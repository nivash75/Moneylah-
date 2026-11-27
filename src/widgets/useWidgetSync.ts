import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { format } from '../core/money';
import { cashInHand, inPeriod, periodOf, shift, spent, totals } from '../core/ledger';
import { useLedger } from '../data/store';
import { periodTitle } from '../ui/periods';

export type MonthProps = {
  title: string;
  income: string;
  expense: string;
  /** Share of the overall budget used, or -1 without a budget. */
  budget: number;
  /** Cash, bank and savings today. */
  balance: string;
};

export type WidgetData = {
  current: MonthProps;
  /** The empty summary that takes over when the next cycle starts. */
  next: { date: Date; props: MonthProps };
};

/** Publishes the current cycle's summary whenever the data changes or the app comes forward. */
export function useWidgetSync(publish: (data: WidgetData) => void) {
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
    const inHand = (date: number) => {
      const cash = cashInHand(state, converter, date);
      // A partial total would mislead.
      return cash.unconverted ? 'Rate missing' : money(cash.amount);
    };
    try {
      publish({
        current: { title: periodTitle(month), income: money(sum.income), expense: money(sum.expense), budget: !hide && overall && used !== null && overall.amount > 0 ? used / overall.amount : -1, balance: inHand(Date.now()) },
        next: { date: new Date(next.start), props: { title: periodTitle(next), income: money(0), expense: money(0), budget: -1, balance: inHand(next.start) } },
      });
    } catch (error) {
      console.warn('Widget update failed', error);
    }
  }, [state, accounts, categories, converter, activations, publish]);
}
