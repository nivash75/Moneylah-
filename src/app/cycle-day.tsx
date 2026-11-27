import { router } from 'expo-router';
import { useLedger } from '../data/store';
import { HeaderButton } from '../ui/HeaderButton';
import { Card, Chips, Note, Screen } from '../ui/kit';

const DAYS = Array.from({ length: 31 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }));

export default function CycleDay() {
  const { state, update } = useLedger();
  const choose = (day: string) => {
    if (update((s) => ({ ...s, settings: { ...s.settings, cycleDay: Number(day) } }))) router.back();
  };

  return (
    <>
      <HeaderButton placement="left" icon="xmark" label="Cancel" onPress={() => router.back()} />
      <Screen>
        <Card title="Day of the month"><Chips value={String(state.settings.cycleDay)} onChange={choose} options={DAYS} /></Card>
        <Note>Budgets and monthly totals reset on this day, for example your payday. In months without that day, the cycle starts on the last day. Your transactions are not changed.</Note>
      </Screen>
    </>
  );
}
