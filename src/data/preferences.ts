import { useSyncExternalStore } from 'react';
import { Appearance } from 'react-native';
import { getLocales } from 'expo-localization';
import { loadLocal, saveLocal } from './db';

export type ThemeChoice = 'auto' | 'light' | 'dark';
export type ClockChoice = '12' | '24';

/** Display choices for this device. They are not part of backups. */
export interface Preferences {
  theme: ThemeChoice;
  /** null follows the device. */
  clock: ClockChoice | null;
}

const saved = loadLocal<Partial<Preferences>>('preferences') ?? {};
let preferences: Preferences = {
  theme: saved.theme === 'light' || saved.theme === 'dark' ? saved.theme : 'auto',
  clock: saved.clock === '12' || saved.clock === '24' ? saved.clock : null,
};
const listeners = new Set<() => void>();

// Applied before the first screen draws, so the app never flashes the other theme.
Appearance.setColorScheme(preferences.theme);

export function setPreferences(change: Partial<Preferences>) {
  preferences = { ...preferences, ...change };
  saveLocal('preferences', preferences);
  Appearance.setColorScheme(preferences.theme);
  listeners.forEach((listener) => listener());
}

export const usePreferences = () =>
  useSyncExternalStore((listener) => { listeners.add(listener); return () => listeners.delete(listener); }, () => preferences);

/** The clock in use: the one chosen, else the device's. */
export function clock(): ClockChoice {
  if (preferences.clock) return preferences.clock;
  return new Date(2000, 0, 1, 13).toLocaleTimeString(undefined, { hour: 'numeric' }).includes('13') ? '24' : '12';
}

/** A date and time such as "27 Nov, 14:30" or "27 Nov, 2:30 pm". */
export const formatDateTime = (ms: number) =>
  new Date(ms).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: clock() === '12' });

/** A time such as "14:30" or "2:30 pm". */
export const formatTime = (ms: number) =>
  new Date(ms).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: clock() === '12' });

/** The iPhone date picker follows a locale rather than an option. undefined keeps the device's own clock. */
export function pickerLocale(): string | undefined {
  if (!preferences.clock) return undefined;
  const tag = getLocales()[0]?.languageTag ?? 'en';
  return `${tag.replace(/-/g, '_')}@hours=${preferences.clock === '24' ? 'h23' : 'h12'}`;
}
