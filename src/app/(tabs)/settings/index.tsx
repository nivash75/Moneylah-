import { Alert, Linking, Platform, Switch } from 'react-native';
import { router } from 'expo-router';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { fromBackup, toBackup } from '../../../core/backup';
import { addBillCategories } from '../../../core/billCategories';
import { localDay, toCsv } from '../../../core/csv';
import { demoState } from '../../../core/seed';
import { toSheets } from '../../../core/excel';
import { toXlsx } from '../../../core/xlsx';
import { sheetsStatus, useSheetsConfig } from '../../../data/sheets';
import { useLedger } from '../../../data/store';
import { backupStatus, useDriveBackup } from '../../../ui/driveBackup';
import { authenticate, canLock } from '../../../ui/LockGate';
import { Card, confirm, Note, Row, Screen } from '../../../ui/kit';

const MAX_BACKUP_BYTES = 50 * 1024 * 1024;
const ios = Platform.OS === 'ios';
const backupTitle = ios ? 'Back up to iCloud Drive' : 'Back up to a folder';
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
async function share(name: string, content: string | Uint8Array, mimeType: string, UTI: string) {
  const file = new File(Paths.cache, name);
  file.create({ overwrite: true });
  try {
    file.write(content);
    await Sharing.shareAsync(file.uri, { mimeType, UTI });
  } finally {
    // Android apps may read the file after sharing returns; it stays in the app's private cache.
    if (ios && file.exists) file.delete();
  }
}

export default function Settings() {
  const { state, update } = useLedger();
  const { settings } = state;
  const today = localDay(Date.now());
  const backUp = useDriveBackup();
  const sheets = useSheetsConfig();

  // Built when tapped, and async so a failure is reported like the other exports.
  const exportExcel = async () => share(`moneylah-${today}.xlsx`, toXlsx(toSheets(state)), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'org.openxmlformats.spreadsheetml.sheet');

  const setLock = async (on: boolean) => {
    if (on && !(await canLock())) return Alert.alert('No device passcode', ios ? 'Set up Face ID or a passcode on this device first.' : 'Set up a screen lock on this device first.');
    if (!(await authenticate())) return;
    update((s) => ({ ...s, settings: { ...s.settings, lockEnabled: on, hideWidgetAmounts: on ? true : s.settings.hideWidgetAmounts } }));
  };

  const restore = async () => {
    const picked = await File.pickFileAsync({ mimeTypes: 'application/json' });
    if (picked.canceled) return;
    if (picked.result.size > MAX_BACKUP_BYTES) throw new Error('The file is too large to be a backup.');
    const restored = fromBackup(await picked.result.text());
    confirm('Replace all data?', `The backup holds ${restored.txns.length} transactions. Everything currently in the app will be deleted.`, 'Replace', () => {
      // The app lock and backup date stay as they are on this device.
      if (update((s) => addBillCategories({ ...restored, settings: { ...restored.settings, lockEnabled: s.settings.lockEnabled, lastBackup: s.settings.lastBackup } }))) Alert.alert('Backup restored');
    });
  };

  return (
    <Screen>
      <Card title="Money">
        <Row icon="cash" title="Currencies and rates" value={settings.baseCurrency} onPress={() => router.push('/rates')} />
        <Row icon="pricetags" title="Categories" onPress={() => router.push('/categories')} />
      </Card>
      {ios ? (
        <Card title="Shortcuts">
          <Row icon="phone-portrait" title="Back Tap to add a transaction" onPress={showBackTapHelp} />
        </Card>
      ) : null}
      <Card title="Privacy">
        <Row icon="lock-closed" title={ios ? 'Lock with Face ID or passcode' : 'Lock with fingerprint or screen lock'}>
          <Switch accessibilityLabel="App lock" value={settings.lockEnabled} onValueChange={(on) => void setLock(on).catch(report('Could not change app lock'))} />
        </Row>
        <Row icon="eye-off" title="Hide amounts in widget">
          <Switch accessibilityLabel="Hide amounts in widget" value={settings.hideWidgetAmounts} onValueChange={(on) => { update((s) => ({ ...s, settings: { ...s.settings, hideWidgetAmounts: on } })); }} />
        </Row>
      </Card>
      <Card title="Your data">
        <Row icon="grid" title="Export to Excel" onPress={() => void exportExcel().catch(report('Export failed'))} />
        <Row icon="document-text" title="Export CSV" onPress={() => void share(`moneylah-${today}.csv`, toCsv(state), 'text/csv', 'public.comma-separated-values-text').catch(report('Export failed'))} />
        <Row icon="cloud-upload" title={backupTitle} subtitle={backupStatus(settings.lastBackup)} onPress={backUp} />
        <Row icon="logo-google" title="Google Sheets backup" subtitle={sheetsStatus(sheets)} onPress={() => router.push('/sheets')} />
        <Row icon="share" title="Share a backup" onPress={() => void share(`moneylah-backup-${today}.json`, toBackup(state), 'application/json', 'public.json').catch(report('Backup failed'))} />
        <Row icon="cloud-download" title="Restore from backup" onPress={() => void restore().catch(report('Restore failed'))} />
      </Card>
      <Note>Backups are not automatic: tap {backupTitle} and pick {ios ? 'a folder there' : 'where to save it'}. To restore, choose that file. Backup files are not encrypted, so keep them somewhere private.</Note>
      {__DEV__ ? (
        <Card title="Development">
          <Row icon="flask" title="Load sample data" onPress={() => confirm('Load sample data?', 'Everything currently in the app will be replaced.', 'Replace', () => { update((s) => addBillCategories({ ...demoState(s.settings.baseCurrency), settings: { ...s.settings, categorySet: 0 } })); })} />
        </Card>
      ) : null}
    </Screen>
  );
}
