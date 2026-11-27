import { Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeTabs } from 'expo-router/native-tabs';
import { useTheme } from '../../ui/kit';

const TABS = [
  ['(home)', 'Transactions', 'list.bullet', 'list'],
  ['stats', 'Stats', 'chart.pie.fill', 'pie-chart'],
  ['accounts', 'Accounts', 'wallet.pass.fill', 'wallet'],
  ['budgets', 'Budgets', 'speedometer', 'speedometer'],
  ['settings', 'Settings', 'gearshape.fill', 'settings'],
] as const;

/** The system tab bar, which is Liquid Glass on iOS 26 and later. */
export default function TabsLayout() {
  const theme = useTheme();
  return (
    <NativeTabs
      minimizeBehavior="onScrollDown"
      sidebarAdaptable
      tintColor={theme.accent}
      // Material would otherwise use its own purple highlight.
      {...(Platform.OS === 'android' ? { backgroundColor: theme.card, indicatorColor: theme.line, labelVisibilityMode: 'labeled' as const, iconColor: { default: theme.dim, selected: theme.accent }, labelStyle: { default: { color: theme.dim }, selected: { color: theme.accent } } } : null)}>
      {TABS.map(([name, title, symbol, glyph]) => (
        <NativeTabs.Trigger key={name} name={name}>
          <NativeTabs.Trigger.Icon
            sf={symbol}
            // Android draws the app's own icons.
            {...(Platform.OS === 'android' ? { src: <NativeTabs.Trigger.VectorIcon family={Ionicons} name={glyph} /> } : null)}
          />
          <NativeTabs.Trigger.Label>{title}</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
      ))}
    </NativeTabs>
  );
}
