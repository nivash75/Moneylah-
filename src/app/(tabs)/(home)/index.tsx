import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { inPeriod, totals } from '../../../core/ledger';
import { format, plain } from '../../../core/money';
import type { Txn } from '../../../core/types';
import { useLedger } from '../../../data/store';
import { HeaderButton } from '../../../ui/HeaderButton';
import { Card, Note, Screen, Segmented, Stepper, T, useTheme } from '../../../ui/kit';
import { periodTitle, usePeriod } from '../../../ui/periods';
import { SummaryRow, TxnRow } from '../../../ui/TxnRow';

const dayStart = (ms: number) => new Date(ms).setHours(0, 0, 0, 0);

export default function Transactions() {
  const { state, accounts, converter } = useLedger();
  const theme = useTheme();
  const { period: month, step } = usePeriod('month');
  const [mode, setMode] = useState<'list' | 'calendar'>('list');
  const [picked, setSelected] = useState(() => dayStart(Date.now()));
  // A day outside the period being viewed falls back to today, then to the first day.
  const within = (ms: number) => ms >= month.start && ms < month.end;
  const today = dayStart(Date.now());
  const selected = within(picked) ? picked : within(today) ? today : month.start;

  const inMonth = useMemo(() => state.txns.filter(inPeriod(month)).sort((a, b) => b.date - a.date), [state.txns, month.start, month.end]);
  const days = useMemo(() => {
    const map = new Map<number, Txn[]>();
    for (const t of inMonth) {
      const key = dayStart(t.date);
      const list = map.get(key);
      if (list) list.push(t);
      else map.set(key, [t]);
    }
    return map;
  }, [inMonth]);

  const money = (v: number) => format(v, converter.base);
  const sum = totals(inMonth, converter, accounts);
  const dayTitle = (ms: number) => new Date(ms).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });

  const first = new Date(month.start);
  const blanks = (first.getDay() + 6) % 7; // Monday first
  const cells: (number | null)[] = Array<null>(blanks).fill(null);
  for (let i = 0, day = month.start; day < month.end; day = +new Date(first.getFullYear(), first.getMonth(), first.getDate() + ++i)) cells.push(day);
  while (cells.length % 7) cells.push(null);
  const compact = (v: number) => (v ? new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(Number(plain(v, converter.base))) : ' ');

  return (
    <>
      <HeaderButton placement="right" icon="plus" label="Add transaction" onPress={() => router.push({ pathname: '/txn', params: mode === 'calendar' ? { date: String(selected) } : {} })} />
      <Screen>
        <Segmented value={mode} onChange={setMode} options={[{ value: 'list', label: 'List' }, { value: 'calendar', label: 'Calendar' }]} />
        <Stepper title={periodTitle(month)} onStep={step} />
        <Card>
          <SummaryRow items={[
            { label: 'Income', value: money(sum.income), color: theme.income },
            { label: 'Expense', value: money(sum.expense), color: theme.expense },
            { label: 'Total', value: money(sum.income - sum.expense) },
          ]} />
        </Card>
        {sum.unconverted > 0 ? <Note warn>{sum.unconverted} transaction(s) left out of totals: add an exchange rate in Settings.</Note> : null}

        {mode === 'list' ? (
          <>
            {[...days].map(([day, list]) => (
              <Card key={day} title={dayTitle(day)}>{list.map((t) => <TxnRow key={t.id} txn={t} />)}</Card>
            ))}
            {inMonth.length === 0 ? <Note>No transactions in this period. Tap + to add one.</Note> : null}
          </>
        ) : (
          <>
            <Card>
              <View style={{ flexDirection: 'row', paddingVertical: 6 }}>
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => <View key={d} style={{ flex: 1 }}><T dim size={11} center>{d}</T></View>)}
              </View>
              {Array.from({ length: cells.length / 7 }, (_, week) => (
                <View key={week} style={{ flexDirection: 'row' }}>
                  {cells.slice(week * 7, week * 7 + 7).map((day, i) => {
                    if (day === null) return <View key={i} style={{ flex: 1 }} />;
                    const s = totals(days.get(day) ?? [], converter, accounts);
                    return (
                      <Pressable key={i} onPress={() => setSelected(day)} accessibilityRole="button" accessibilityLabel={`${dayTitle(day)}, income ${money(s.income)}, expense ${money(s.expense)}`} style={{ flex: 1, minHeight: 52, borderRadius: 8, borderWidth: 1.5, borderColor: day === selected ? theme.accent : 'transparent', paddingVertical: 3 }}>
                        <T size={13} center bold={day === dayStart(Date.now())}>{new Date(day).getDate()}</T>
                        <T size={10} center color={theme.income}>{compact(s.income)}</T>
                        <T size={10} center color={theme.expense}>{compact(s.expense)}</T>
                      </Pressable>
                    );
                  })}
                </View>
              ))}
            </Card>
            <Card title={dayTitle(selected)}>
              {(days.get(selected) ?? []).map((t) => <TxnRow key={t.id} txn={t} />)}
              {!days.has(selected) ? <View style={{ paddingVertical: 12 }}><T dim>Nothing recorded on this day.</T></View> : null}
            </Card>
          </>
        )}
      </Screen>
    </>
  );
}
