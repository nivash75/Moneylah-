import { Pressable, View } from 'react-native';
import { router, Stack } from 'expo-router';
import { categoryName, forecast, isWithin, spent } from '../../../core/ledger';
import { format } from '../../../core/money';
import type { Txn } from '../../../core/types';
import { useLedger } from '../../../data/store';
import { Bar, Card, Note, Row, Screen, Stepper, T, useTheme } from '../../../ui/kit';
import { Outlook } from '../../../ui/Outlook';
import { dayMonth, periodTitle, usePeriod } from '../../../ui/periods';

export default function Budgets() {
  const { state, accounts, categories, converter } = useLedger();
  const theme = useTheme();
  const { period: month, step, isCurrent } = usePeriod('month');
  const sorted = [...state.budgets].sort((a, b) => Number(a.categoryId !== null) - Number(b.categoryId !== null));

  return (
    <>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button icon="plus" accessibilityLabel="Add budget" onPress={() => router.push('/budget-form')} />
      </Stack.Toolbar>
      <Screen>
        <Card>
          <Row icon="calendar" title="Cycle starts on" subtitle="Monthly totals reset on this day" value={`Day ${state.settings.cycleDay}`} onPress={() => router.push('/cycle-day')} />
        </Card>
        <Stepper title={periodTitle(month)} onStep={step} />
        {isCurrent ? <Outlook /> : null}
        {sorted.map((budget) => {
          const used = spent(budget, state.txns, month, converter, accounts, categories);
          const name = budget.categoryId ? categoryName(budget.categoryId, categories) : 'All spending';
          const money = (v: number) => format(v, budget.currency);
          const fraction = used === null || budget.amount <= 0 ? 0 : used / budget.amount;
          // The overall budget's projection is already shown above.
          const counts = (t: Txn) => budget.categoryId !== null && isWithin(t.categoryId, budget.categoryId, categories);
          const projected = isCurrent && budget.categoryId ? converter.convert(forecast(state.txns, counts, month, Date.now(), converter, accounts).projected, converter.base, budget.currency) : null;
          return (
            <Pressable key={budget.id} accessibilityRole="button" onPress={() => router.push({ pathname: '/budget-form', params: { id: budget.id } })}>
              <Card>
                <View style={{ gap: 8, paddingVertical: 10 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <T bold>{name}</T>
                    <T dim>{money(budget.amount)}</T>
                  </View>
                  <Bar fraction={fraction} color={fraction > 1 ? theme.danger : fraction > 0.8 ? theme.warn : theme.accent} />
                  {used === null ? (
                    <T size={13} color={theme.warn}>Exchange rate missing</T>
                  ) : (
                    <T size={13} color={used > budget.amount ? theme.danger : theme.dim}>
                      {money(used)} spent · {used > budget.amount ? `${money(used - budget.amount)} over` : `${money(budget.amount - used)} left`}
                    </T>
                  )}
                  {projected !== null ? (
                    <T size={13} color={projected > budget.amount ? theme.danger : theme.dim}>
                      Projected {money(projected)} by {dayMonth(new Date(month.end - 1))}
                    </T>
                  ) : null}
                </View>
              </Card>
            </Pressable>
          );
        })}
        {sorted.length === 0 ? <Note>No budgets yet. Tap + to set a monthly limit.</Note> : null}
      </Screen>
    </>
  );
}
