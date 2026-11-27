import { useEffect, useState } from 'react';
import { Alert, AppState, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { dueReminders } from '../core/loans';
import { useStore } from './store';

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

/** Android groups notifications into channels, and asks for permission only once one exists. */
const CHANNEL = 'due-dates';
const prepareChannel = async () => {
  if (Platform.OS === 'android') await Notifications.setNotificationChannelAsync(CHANNEL, { name: 'Due dates', importance: Notifications.AndroidImportance.HIGH });
};

/** Asks for permission the first time a due date is saved. */
export async function allowReminders() {
  await prepareChannel();
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return;
  const asked = current.canAskAgain ? await Notifications.requestPermissionsAsync() : current;
  if (!asked.granted) Alert.alert('Reminders are off', 'To be notified on due dates, allow notifications for Moneylah! in the device Settings.');
}

/** Runs one change at a time, so a slow earlier pass can't undo a later one. */
let queue: Promise<unknown> = Promise.resolve();

/** Keeps the scheduled notifications matching the loans that are still open. */
export function ReminderSync() {
  const { state } = useStore();
  const [activations, setActivations] = useState(0);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') setActivations((n) => n + 1); });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    const discreet = state.settings.lockEnabled || state.settings.hideWidgetAmounts;
    const wanted = dueReminders(state, discreet);
    queue = queue.then(async () => {
      await Notifications.cancelAllScheduledNotificationsAsync();
      if (!(await Notifications.getPermissionsAsync()).granted) return;
      await prepareChannel();
      for (const r of wanted) {
        await Notifications.scheduleNotificationAsync({
          identifier: r.id,
          content: { title: r.title, body: r.body },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: r.at, channelId: CHANNEL },
        });
      }
    }).catch((error: unknown) => console.log('Reminder update failed', error));
  }, [state, activations]);

  return null;
}
