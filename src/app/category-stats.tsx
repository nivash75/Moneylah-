import { View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { breakdown, forecast, inPeriod, periodDays, periodOf, previousComparable, rootCategory, shift, spent, totals, type PeriodUnit } from '../core/ledger';
import { format } from '../core/money';
import type { Txn } from '../core/types';
import { useLedger } from '../data/store';
import { Bar, Card, Note, Row, Screen, T, useTheme } from '../ui/kit';
import { changeText, periodTitle, shortLabel } from '../ui/periods';
import { TxnRow } from '../ui/TxnRow';

export default function CategoryStats() {
  const params = useLocalSearchParams<{ id: string; kind: 'expense' | 'income'; unit: PeriodUnit; start: string }>();
  const { state, accounts, categories, converter } = useLedger();
  const theme = useTheme();
  const { id, kind, unit } = params;
  const now = Date.now();
  const period = periodOf(unit, Number(params.start), 1, state.settings.cycleDay);
  const category = categories.get(id);
  const money = (v: number) => format(v, converter.base);

  const belongs = (t: Txn) => t.kind === kind && (rootCategory(t.categoryId, categories)?.id ?? 'none') === id;
  const mine = state.txns.filter(belongs);
  const amountIn = (p: typeof period) => totals(mine.filter(inPeriod(p)), converter, accounts)[kind];
  const txns = mine.filter(inPeriod(period)).sort((a, b) => b.date - a.date);
  const total = amountIn(period);
  const running = inPeriod(period)({ date: now } as Txn);
  const days = periodDays(period, now);
  const previous = previousComparable(period, now);
  const comparable = state.txns.some((t) => t.date < previous.end);
  const parts = breakdown(txns, kind, converter, accounts, categories, true);
  const history = [-5, -4, -3, -2, -1, 0].map((n) => shift(period, n)).map((p) => ({ label: shortLabel(p), amount: amountIn(p) }));
  const highest = Math.max(1, ...history.map((h) => h.amount));
  const color = kind === 'income' ? theme.income : theme.expense;

  const monthly = unit === 'month' && kind === 'expense';
  const projection = monthly && running ? forecast(state.txns, belongs, period, now, converter, accounts) : null;
  const budget = monthly ? state.budgets.find((b) => b.categoryId === id) : undefined;
  const used = budget ? spent(budget, state.txns, period, converter, accounts, categories) : null;

  return (
    <Screen>
      <Stack.Screen options={{ title: category?.name ?? 'Uncategorised' }} />
      <Card title={periodTitle(period)}>
        <Row title="Total" value={money(total)} valueColor={color} />
        <Row title="Average per day" value={money(Math.round(total / (running ? days.elapsed : days.total)))} />
        {comparable ? <Row title="Change" subtitle={running ? 'Since the same point in the previous period' : 'Since the previous period'} value={changeText(total - amountIn(previous), money)} /> : null}
        {projection ? <Row title="Projected" subtitle="By the end of this period" value={money(projection.projected)} /> : null}
        {budget && used !== null ? (
          <Row title={used > budget.amount ? 'Over budget' : 'Budget left'} subtitle={`Limit ${format(budget.amount, budget.currency)}`} value={format(Math.abs(budget.amount - used), budget.currency)} valueColor={used > budget.amount ? theme.danger : undefined} />
        ) : null}
      </Card>
      {parts.length > 1 || (parts.length === 1 && parts[0].id !== id) ? (
        <Card title="By subcategory">
          {parts.map((p) => (
            <View key={p.id} style={{ gap: 6, paddingVertical: 8 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <T>{p.id === id ? 'No subcategory' : p.name}</T>
                <T>{money(p.amount)}</T>
              </View>
              <Bar fraction={p.amount / total} color={theme.accent} />
            </View>
          ))}
        </Card>
      ) : null}
      <Card title="Last six periods">
        {history.map((h, i) => (
          <View key={i} style={{ gap: 6, paddingVertical: 8 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <T dim size={13}>{h.label}</T>
              <T size={13}>{money(h.amount)}</T>
            </View>
            <Bar fraction={h.amount / highest} color={color} />
          </View>
        ))}
      </Card>
      <Card title="Transactions">
        {txns.slice(0, 200).map((t) => <TxnRow key={t.id} txn={t} showDate />)}
        {txns.length === 0 ? <Row title="Nothing in this period" /> : null}
      </Card>
      {txns.length > 200 ? <Note>Showing the latest 200. Export CSV for the full history.</Note> : null}
    </Screen>
  );
}
