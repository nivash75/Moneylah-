import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, AppState, Keyboard, StyleSheet, View } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { useStore } from '../data/store';
import { Button, Icon, T, useTheme } from './kit';
import { Overlay } from './Overlay';

export const canLock = async () => (await LocalAuthentication.getEnrolledLevelAsync()) !== LocalAuthentication.SecurityLevel.NONE;
export const authenticate = async () => (await LocalAuthentication.authenticateAsync({ promptMessage: 'Unlock your records' })).success;

/** Covers every screen, including sheets, while locked or while shown in the app switcher. */
export function LockGate() {
  const { state, update } = useStore();
  const theme = useTheme();
  const enabled = state.settings.lockEnabled;
  const [locked, setLocked] = useState(enabled);
  const [appState, setAppState] = useState(AppState.currentState);
  const busy = useRef(false);
  const prompted = useRef(false);

  const unlock = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      if (!(await canLock())) {
        update((s) => ({ ...s, settings: { ...s.settings, lockEnabled: false } }));
        setLocked(false);
        Alert.alert('App lock turned off', 'This device no longer has a passcode.');
      } else if (await authenticate()) {
        setLocked(false);
      }
    } finally {
      busy.current = false;
    }
  }, [update]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      setAppState(next);
      if (next === 'background') {
        prompted.current = false;
        if (enabled) { Keyboard.dismiss(); setLocked(true); }
      }
    });
    return () => sub.remove();
  }, [enabled]);

  // A form opened by a shortcut must not raise the keyboard over the lock screen.
  useEffect(() => {
    if (!enabled || !locked) return;
    const sub = Keyboard.addListener('keyboardDidShow', () => Keyboard.dismiss());
    return () => sub.remove();
  }, [enabled, locked]);

  // Prompt once each time the app comes forward; after a cancel the button retries.
  useEffect(() => {
    if (enabled && locked && appState === 'active' && !prompted.current) {
      prompted.current = true;
      void unlock();
    }
  }, [enabled, locked, appState, unlock]);

  if (!enabled || (!locked && appState === 'active')) return null;
  return (
    <Overlay>
      <View accessibilityViewIsModal style={[StyleSheet.absoluteFill, styles.cover, { backgroundColor: theme.bg }]}>
        <Icon name="lock-closed" size={48} />
        <T bold size={22}>Moneylah! is locked</T>
        {locked ? <View style={{ width: 200 }}><Button title="Unlock" onPress={() => void unlock()} /></View> : null}
      </View>
    </Overlay>
  );
}

const styles = StyleSheet.create({ cover: { alignItems: 'center', justifyContent: 'center', gap: 16 } });
