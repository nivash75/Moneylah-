import { NativeTabs } from 'expo-router/native-tabs';
import { useTheme } from './kit';
import { TABS } from './tabList';

/** The system tab bar, which is Liquid Glass on iOS 26 and later. */
export function AppTabs() {
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
