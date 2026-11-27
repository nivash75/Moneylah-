import { useEffect, useState } from 'react';
import { Alert, Platform, Share } from 'react-native';
import { randomUUID } from 'expo-crypto';
import { appsScript, isScriptUrl } from '../core/googleSheets';
import { backUpToSheets, setSheetsConfig, sheetsStatus, useSheetsConfig } from '../data/sheets';
import { useStore } from '../data/store';
import { Button, Card, confirm, Field, Note, Row, Screen } from '../ui/kit';

export default function GoogleSheets() {
  const { state } = useStore();
  const config = useSheetsConfig();
  const [url, setUrl] = useState(config.url);
  const [busy, setBusy] = useState(false);

  // Made once, so the script shared earlier stays valid.
  useEffect(() => {
    if (!config.secret) setSheetsConfig({ secret: `${randomUUID()}${randomUUID()}`.replace(/-/g, '') });
  }, [config.secret]);

  const backUp = async () => {
    setBusy(true);
    await backUpToSheets(state, true);
    setBusy(false);
  };

  const connect = () => {
    const link = url.trim();
    if (!isScriptUrl(link)) return Alert.alert('Check the link', 'Paste the Web app URL from Apps Script. It starts with https://script.google.com/ and ends with /exec.');
    setSheetsConfig({ url: link, error: '', lastAt: 0, checksum: 0 });
    void backUp();
  };

  return (
    <Screen>
      <Note>Your transactions, notes and account balances are copied to a spreadsheet in your own Google account, shortly after you change them while the app is open.</Note>
      <Card title="1. Add the script">
        <Row icon="share" title="Share the script" subtitle={Platform.OS === 'ios' ? 'Send it to your computer, for example by AirDrop' : 'Send it to your computer'} onPress={() => void Share.share({ message: appsScript(config.secret) }).catch(() => {})} />
      </Card>
      <Note>On a computer, create a new Google Sheet. Open Extensions &gt; Apps Script, replace everything with this script and save. Choose Deploy &gt; New deployment &gt; Web app, set Execute as to Me and Who has access to Anyone, then Deploy and allow access. Copy the Web app URL.</Note>
      <Card title="2. Paste the web app URL">
        <Field label="Link" value={url} onChangeText={setUrl} placeholder="https://script.google.com/…" autoCapitalize="none" autoCorrect={false} keyboardType="url" />
      </Card>
      <Button title={busy ? 'Backing up…' : config.url && url.trim() === config.url ? 'Back up now' : 'Connect and back up'} onPress={() => { if (!busy) { if (config.url && url.trim() === config.url) void backUp(); else connect(); } }} />
      {config.url ? (
        <Card>
          <Row icon={config.error ? 'alert-circle' : 'checkmark-circle'} title={sheetsStatus(config)} subtitle={config.error || undefined} />
        </Card>
      ) : null}
      <Note>Each backup replaces the three Moneylah! tabs; use File &gt; Version history in Google Sheets to see earlier copies. It can't be restored into the app, so keep using backup files for that. Keep the script and link private.</Note>
      {config.url ? <Button kind="danger" title="Disconnect" onPress={() => confirm('Stop backing up?', 'Your spreadsheet is kept. Delete the deployment in Apps Script to disable the link.', 'Disconnect', () => { setUrl(''); setSheetsConfig({ url: '', error: '', lastAt: 0, checksum: 0 }); })} /> : null}
    </Screen>
  );
}
