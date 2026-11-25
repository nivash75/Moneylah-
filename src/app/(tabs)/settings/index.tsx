import { Alert, Linking, Switch } from 'react-native';
import { router } from 'expo-router';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { fromBackup, toBackup } from '../../../core/backup';
import { toCsv } from '../../../core/csv';
import { demoState } from '../../../core/seed';
import { useLedger } from '../../../data/store';
import { authenticate, canLock } from '../../../ui/LockGate';
import { Card, confirm, Note, Row, Screen } from '../../../ui/kit';

const MAX_BACKUP_BYTES = 50 * 1024 * 1024;
const report = (title: string) => (error: unknown) => Alert.alert(title, error instanceof Error ? error.message : String(error));

const showBackTapHelp = () =>
  Alert.alert(
    'Add a transaction with Back Tap',
    '1. In Shortcuts, tap +, add the Moneylah! action "Add Transaction", then close it.\n\n2. In iPhone Settings, go to Accessibility > Touch > Back Tap > Double Tap and choose that shortcut.',
    [
      { text: 'Close', style: 'cancel' },
      { text: 'Open Shortcuts', onPress: () => void Linking.openURL('shortcuts://').catch(report('Could not open Shortcuts')) },
    ],
  );

/** Shares through a temporary file that is removed afterwards. */
async function share(name: string, text: string, mimeType: string, UTI: string) {
  const file = new File(Paths.cache, name);
  file.create({ overwrite: true });
  try {
    file.write(text);
    await Sharing.shareAsync(file.uri, { mimeType, UTI });
  } finally {
    if (file.exists) file.delete();
  }
}

export default function Settings() {
  const { state, update } = useLedger();
  const { settings } = state;
  const today = new Date().toISOString().slice(0, 10);

  const setLock = async (on: boolean) => {
    if (on && !(await canLock())) return Alert.alert('No device passcode', 'Set up Face ID or a passcode on this device first.');
    if (!(await authenticate())) return;
    update((s) => ({ ...s, settings: { ...s.settings, lockEnabled: on, hideWidgetAmounts: on ? true : s.settings.hideWidgetAmounts } }));
  };

  const restore = async () => {
    const picked = await File.pickFileAsync({ mimeTypes: 'application/json' });
    if (picked.canceled) return;
    if (picked.result.size > MAX_BACKUP_BYTES) throw new Error('The file is too large to be a backup.');
    const restored = fromBackup(await picked.result.text());
    confirm('Replace all data?', `The backup holds ${restored.txns.length} transactions. Everything currently in the app will be deleted.`, 'Replace', () => {
      // The app lock stays as it is on this device.
      if (update((s) => ({ ...restored, settings: { ...restored.settings, lockEnabled: s.settings.lockEnabled } }))) Alert.alert('Backup restored');
    });
  };

  return (
    <Screen>
      <Card title="Money">
        <Row icon="cash" title="Currencies and rates" value={settings.baseCurrency} onPress={() => router.push('/rates')} />
        <Row icon="pricetags" title="Categories" onPress={() => router.push('/categories')} />
      </Card>
      <Card title="Shortcuts">
        <Row icon="phone-portrait" title="Back Tap to add a transaction" onPress={showBackTapHelp} />
      </Card>
      <Card title="Privacy">
        <Row icon="lock-closed" title="Lock with Face ID or passcode">
          <Switch accessibilityLabel="App lock" value={settings.lockEnabled} onValueChange={(on) => void setLock(on).catch(report('Could not change app lock'))} />
        </Row>
        <Row icon="eye-off" title="Hide amounts in widget">
          <Switch accessibilityLabel="Hide amounts in widget" value={settings.hideWidgetAmounts} onValueChange={(on) => { update((s) => ({ ...s, settings: { ...s.settings, hideWidgetAmounts: on } })); }} />
        </Row>
      </Card>
      <Card title="Your data">
        <Row icon="document-text" title="Export CSV" onPress={() => void share(`moneylah-${today}.csv`, toCsv(state), 'text/csv', 'public.comma-separated-values-text').catch(report('Export failed'))} />
        <Row icon="cloud-upload" title="Back up" onPress={() => void share(`moneylah-backup-${today}.json`, toBackup(state), 'application/json', 'public.json').catch(report('Backup failed'))} />
        <Row icon="cloud-download" title="Restore from backup" onPress={() => void restore().catch(report('Restore failed'))} />
      </Card>
      <Note>Your records stay on this device. Backup files are not encrypted, so keep them somewhere private, such as iCloud Drive.</Note>
      {__DEV__ ? (
        <Card title="Development">
          <Row icon="flask" title="Load sample data" onPress={() => confirm('Load sample data?', 'Everything currently in the app will be replaced.', 'Replace', () => { update((s) => ({ ...demoState(s.settings.baseCurrency), settings: s.settings })); })} />
        </Card>
      ) : null}
    </Screen>
  );
}
