import { router } from 'expo-router';
import { forecast, periodOf } from '../core/ledger';
import { format } from '../core/money';
import { useLedger } from '../data/store';
import { Card, Row, useTheme } from './kit';
import { dayMonth } from './periods';

/** Budget left and projected spending for the current cycle. */
export function Outlook() {
  const { state, accounts, converter } = useLedger();
  const theme = useTheme();
  const now = Date.now();
  const period = periodOf('month', now, 1, state.settings.cycleDay);
  const overall = state.budgets.find((b) => b.categoryId === null);
  const currency = overall?.currency ?? converter.base;
  const result = forecast(state.txns, () => true, period, now, converter, accounts);
  const spent = converter.convert(result.spent, converter.base, currency);
  const projected = converter.convert(result.projected, converter.base, currency);
  const money = (v: number) => format(v, currency);
  const title = state.settings.cycleDay === 1 ? 'This month' : 'This cycle';
  if (spent === null || projected === null) return <Card title={title}><Row icon="alert-circle" title="Exchange rate missing" subtitle="Add it in Settings to see budget left" /></Card>;

  const left = overall ? overall.amount - spent : 0;
  const days = `${result.daysLeft} day${result.daysLeft === 1 ? '' : 's'}`;
  const basis = result.history ? `from your last ${result.history === 1 ? 'cycle' : `${result.history} cycles`}` : 'from your daily pace';
  const excess = overall ? projected - overall.amount : 0;

  return (
    <Card title={title}>
      {overall ? (
        <Row icon="wallet" title={left < 0 ? 'Over budget' : 'Budget left'} subtitle={left > 0 ? `${money(Math.floor(left / result.daysLeft))} a day for ${days}` : `${money(spent)} spent of ${money(overall.amount)}`} value={money(Math.abs(left))} valueColor={left < 0 ? theme.danger : undefined} />
      ) : (
        <Row icon="wallet" title="Budget left" subtitle="Set an All spending budget to see this" onPress={() => router.push('/budget-form')} />
      )}
      <Row icon="trending-up" title="Projected spending" subtitle={`By ${dayMonth(new Date(period.end - 1))}, ${basis}${excess > 0 ? `. ${money(excess)} over budget` : ''}`} value={money(projected)} valueColor={excess > 0 ? theme.danger : undefined} />
    </Card>
  );
}
