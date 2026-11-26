import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { breakdown, inPeriod, periodDays, previousComparable, shift, totals, type PeriodUnit } from '../../../core/ledger';
import { format } from '../../../core/money';
import { useLedger } from '../../../data/store';
import { Donut, PALETTE, Trend } from '../../../ui/Charts';
import { Card, Note, Row, Screen, Segmented, Stepper, useTheme } from '../../../ui/kit';
import { changeText, periodTitle, shortLabel, usePeriod } from '../../../ui/periods';
import { SummaryRow } from '../../../ui/TxnRow';

export default function Stats() {
  const { state, accounts, categories, converter } = useLedger();
  const theme = useTheme();
  const [unit, setUnit] = useState<PeriodUnit>('month');
  const { period, step, reset, isCurrent } = usePeriod(unit);
  const [kind, setKind] = useState<'expense' | 'income'>('expense');
  const money = (v: number) => format(v, converter.base);

  const txns = state.txns.filter(inPeriod(period));
  const sum = totals(txns, converter, accounts);
  const slices = breakdown(txns, kind, converter, accounts, categories);
  const total = slices.reduce((a, s) => a + s.amount, 0);
  const now = Date.now();
  const days = periodDays(period, now);
  const previous = previousComparable(period, now);
  const comparable = state.txns.some((t) => t.date < previous.end);
  const before = new Map(breakdown(state.txns.filter(inPeriod(previous)), kind, converter, accounts, categories).map((s) => [s.id, s.amount]));
  const trend = [-5, -4, -3, -2, -1, 0].map((n) => {
    const p = shift(period, n);
    return { label: shortLabel(p), ...totals(state.txns.filter(inPeriod(p)), converter, accounts) };
  });

  return (
    <Screen>
      <Segmented<PeriodUnit> value={unit} onChange={(next) => { setUnit(next); reset(); }} options={[{ value: 'week', label: 'Week' }, { value: 'month', label: 'Month' }, { value: 'year', label: 'Year' }]} />
      <Stepper title={periodTitle(period)} onStep={step} />
      <Card>
        <SummaryRow items={[
          { label: 'Income', value: money(sum.income), color: theme.income },
          { label: 'Expense', value: money(sum.expense), color: theme.expense },
          { label: 'Net', value: money(sum.income - sum.expense) },
        ]} />
      </Card>
      {sum.unconverted > 0 ? <Note warn>{sum.unconverted} transaction(s) left out: exchange rate missing.</Note> : null}
      <Segmented value={kind} onChange={setKind} options={[{ value: 'expense', label: 'Expense' }, { value: 'income', label: 'Income' }]} />
      <Card title="By category">
        {total > 0 ? <Donut values={slices.map((s) => s.amount)} label={money(total)} /> : <Row title="Nothing in this period" />}
        {total > 0 ? <Row title="Average per day" value={money(Math.round(total / (isCurrent ? days.elapsed : days.total)))} /> : null}
        {slices.map((s, i) => (
          <Row key={s.id} icon={s.icon} title={s.name} subtitle={[`${Math.round((s.amount / total) * 100)}%`, comparable ? changeText(s.amount - (before.get(s.id) ?? 0), money) : ''].filter(Boolean).join(' · ')} value={money(s.amount)} onPress={() => router.push({ pathname: '/category-stats', params: { id: s.id, kind, unit, start: String(period.start) } })}>
            <Dot color={PALETTE[i % PALETTE.length]} />
          </Row>
        ))}
      </Card>
      {comparable && total > 0 ? <Note>{isCurrent ? 'Arrows compare with the same point in the previous period.' : 'Arrows compare with the previous period.'} Tap a category for details.</Note> : null}
      <Card title="Last six periods"><Trend data={trend} /></Card>
    </Screen>
  );
}

function Dot({ color }: { color: string }) {
  return <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }} />;
}
