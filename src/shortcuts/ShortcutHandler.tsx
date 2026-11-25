import { useEffect } from 'react';
import { Settings } from 'react-native';
import { router, usePathname, useRootNavigationState } from 'expo-router';

const KEY = 'shortcutAddTransaction';
/** Older requests are ignored, so a missed one can't open the form much later. */
const MAX_AGE_SECONDS = 60;
/** A late change notification can repeat a value that was already cleared, so remember it. */
let lastHandled = 0;

/** Opens a new transaction when the "Add Transaction" shortcut has run. */
export function ShortcutHandler() {
  const ready = !!useRootNavigationState()?.key;
  const pathname = usePathname();

  useEffect(() => {
    if (!ready) return;
    const handle = () => {
      const requested = Number(Settings.get(KEY) ?? 0);
      if (!requested) return;
      Settings.set({ [KEY]: 0 });
      if (requested === lastHandled) return;
      lastHandled = requested;
      if (Date.now() / 1000 - requested < MAX_AGE_SECONDS && pathname !== '/txn') router.push('/txn');
    };
    handle();
    const watch = Settings.watchKeys(KEY, handle);
    return () => Settings.clearWatch(watch);
  }, [ready, pathname]);

  return null;
}
