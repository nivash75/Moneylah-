import { NativeTabs } from 'expo-router/native-tabs';
import { useTheme } from '../../ui/kit';

const TABS = [
  ['(home)', 'Transactions', 'list.bullet'],
  ['stats', 'Stats', 'chart.pie.fill'],
  ['accounts', 'Accounts', 'wallet.pass.fill'],
  ['budgets', 'Budgets', 'speedometer'],
  ['settings', 'Settings', 'gearshape.fill'],
] as const;

/** The system tab bar, which is Liquid Glass on iOS 26 and later. */
export default function TabsLayout() {
  const theme = useTheme();
  return (
    <NativeTabs minimizeBehavior="onScrollDown" sidebarAdaptable tintColor={theme.accent}>
      {TABS.map(([name, title, symbol]) => (
        <NativeTabs.Trigger key={name} name={name}>
          <NativeTabs.Trigger.Icon sf={symbol} />
          <NativeTabs.Trigger.Label>{title}</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
      ))}
    </NativeTabs>
  );
}
