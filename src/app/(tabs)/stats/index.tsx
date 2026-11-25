import { useState } from 'react';
import { View } from 'react-native';
import { breakdown, inPeriod, periodOf, shift, totals, type Period, type PeriodUnit } from '../../../core/ledger';
import { format } from '../../../core/money';
import { useLedger } from '../../../data/store';
import { Donut, PALETTE, Trend } from '../../../ui/Charts';
import { Card, Note, Row, Screen, Segmented, Stepper, useTheme } from '../../../ui/kit';
import { SummaryRow } from '../../../ui/TxnRow';

function periodTitle(p: Period) {
  const start = new Date(p.start);
  if (p.unit === 'year') return String(start.getFullYear());
  if (p.unit === 'month') return start.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const day = (d: Date) => d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  return `${day(start)} – ${day(new Date(p.end - 1))}`;
}
const shortLabel = (p: Period) =>
  new Date(p.start).toLocaleDateString(undefined, p.unit === 'year' ? { year: 'numeric' } : p.unit === 'month' ? { month: 'short' } : { day: 'numeric', month: 'numeric' });

export default function Stats() {
  const { state, accounts, categories, converter } = useLedger();
  const theme = useTheme();
  const [period, setPeriod] = useState(() => periodOf('month', Date.now()));
  const [kind, setKind] = useState<'expense' | 'income'>('expense');
  const money = (v: number) => format(v, converter.base);

  const txns = state.txns.filter(inPeriod(period));
  const sum = totals(txns, converter, accounts);
  const slices = breakdown(txns, kind, converter, accounts, categories);
  const total = slices.reduce((a, s) => a + s.amount, 0);
  const trend = [-5, -4, -3, -2, -1, 0].map((n) => {
    const p = shift(period, n);
    return { label: shortLabel(p), ...totals(state.txns.filter(inPeriod(p)), converter, accounts) };
  });

  return (
    <Screen>
      <Segmented<PeriodUnit> value={period.unit} onChange={(unit) => setPeriod(periodOf(unit, Date.now()))} options={[{ value: 'week', label: 'Week' }, { value: 'month', label: 'Month' }, { value: 'year', label: 'Year' }]} />
      <Stepper title={periodTitle(period)} onStep={(d) => setPeriod(shift(period, d))} />
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
        {slices.map((s, i) => (
          <Row key={s.id} icon={s.icon} title={s.name} subtitle={`${Math.round((s.amount / total) * 100)}%`} value={money(s.amount)}>
            <Dot color={PALETTE[i % PALETTE.length]} />
          </Row>
        ))}
      </Card>
      <Card title="Last six periods"><Trend data={trend} /></Card>
    </Screen>
  );
}

function Dot({ color }: { color: string }) {
  return <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }} />;
}
