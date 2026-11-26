import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import { RatesSync } from '../data/rates';
import { StoreProvider } from '../data/store';
import { ShortcutHandler } from '../shortcuts/ShortcutHandler';
import { LockGate } from '../ui/LockGate';
import { glassHeader } from '../ui/headers';
import { useTheme } from '../ui/kit';
import { WidgetSync } from '../widgets/WidgetSync';

export default function RootLayout() {
  const scheme = useColorScheme();
  const theme = useTheme();
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const modal = { presentation: 'modal' } as const;
  return (
    <StoreProvider>
      <ThemeProvider value={{ ...base, colors: { ...base.colors, primary: theme.accent, background: theme.bg, text: theme.text, border: theme.line } }}>
        <Stack screenOptions={glassHeader}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false, title: 'Back' }} />
          <Stack.Screen name="txn" options={{ ...modal, title: 'Transaction' }} />
          <Stack.Screen name="account-form" options={{ ...modal, title: 'Account' }} />
          <Stack.Screen name="category-form" options={{ ...modal, title: 'Category' }} />
          <Stack.Screen name="budget-form" options={{ ...modal, title: 'Budget' }} />
          <Stack.Screen name="cycle-day" options={{ ...modal, title: 'Cycle starts on' }} />
          <Stack.Screen name="account/[id]" options={{ title: 'Account' }} />
          <Stack.Screen name="categories" options={{ title: 'Categories' }} />
          <Stack.Screen name="category-stats" options={{ title: 'Category' }} />
          <Stack.Screen name="rates" options={{ title: 'Currencies' }} />
        </Stack>
        <StatusBar style="auto" />
        <WidgetSync />
        <RatesSync />
        <ShortcutHandler />
        <LockGate />
      </ThemeProvider>
    </StoreProvider>
  );
}
