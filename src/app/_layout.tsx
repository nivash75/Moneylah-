import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform, useColorScheme } from 'react-native';
import { multiCurrency } from '../data/features';
import { RatesSync } from '../data/rates';
import { ReminderSync } from '../data/reminders';
import { SheetsSync } from '../data/sheets';
import { StoreProvider } from '../data/store';
import { ShortcutHandler } from '../shortcuts/ShortcutHandler';
import { LockGate } from '../ui/LockGate';
import { glassHeader, modalOptions as modal } from '../ui/headers';
import { useTheme } from '../ui/kit';
import { WidgetSync } from '../widgets/WidgetSync';

export default function RootLayout() {
  const scheme = useColorScheme();
  const theme = useTheme();
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  return (
    <StoreProvider>
      <ThemeProvider value={{ ...base, colors: { ...base.colors, primary: theme.accent, background: theme.bg, text: theme.text, border: theme.line, ...(Platform.OS === 'android' ? { card: theme.bg } : null) } }}>
        <Stack screenOptions={glassHeader}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false, title: 'Back' }} />
          <Stack.Screen name="txn" options={{ ...modal, title: 'Transaction' }} />
          <Stack.Screen name="account-form" options={{ ...modal, title: 'Account' }} />
          <Stack.Screen name="category-form" options={{ ...modal, title: 'Category' }} />
          <Stack.Screen name="budget-form" options={{ ...modal, title: 'Budget' }} />
          <Stack.Screen name="sheets" options={{ title: 'Google Sheets' }} />
          <Stack.Screen name="loan" options={{ ...modal, title: 'Lend or borrow' }} />
          <Stack.Screen name="cycle-day" options={{ ...modal, title: 'Cycle starts on' }} />
          <Stack.Screen name="account/[id]" options={{ title: 'Account' }} />
          <Stack.Screen name="categories" options={{ title: 'Categories' }} />
          <Stack.Screen name="category-stats" options={{ title: 'Category' }} />
          <Stack.Screen name="rates" options={{ title: multiCurrency ? 'Currencies' : 'Currency' }} />
        </Stack>
        <StatusBar style="auto" />
        <WidgetSync />
        {multiCurrency ? <RatesSync /> : null}
        <ReminderSync />
        <SheetsSync />
        <ShortcutHandler />
        <LockGate />
      </ThemeProvider>
    </StoreProvider>
  );
}
