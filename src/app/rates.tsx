import { useState } from 'react';
import { Alert } from 'react-native';
import { Stack } from 'expo-router';
import { remove, upsert } from '../core/actions';
import { CURRENCIES } from '../core/money';
import { useLedger } from '../data/store';
import { Card, Chips, confirm, decimalSeparator, Field, Note, Screen } from '../ui/kit';

export default function Rates() {
  const { state, update } = useLedger();
  const separator = decimalSeparator();
  const base = state.settings.baseCurrency;
  const [added, setAdded] = useState<string[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const needed = [...new Set([...state.accounts.map((a) => a.currency), ...state.budgets.map((b) => b.currency), ...state.rates.map((r) => r.id), ...added])].filter((c) => c !== base).sort();
  const stored = (code: string) => {
    const rate = state.rates.find((r) => r.id === code && r.base === base);
    return rate ? String(rate.rate).replace('.', separator) : '';
  };

  const save = () => {
    const changes = Object.entries(drafts).map(([code, text]) => ({ code, text: text.trim(), rate: Number(text.trim().replace(separator, '.')) }));
    const bad = changes.find((c) => c.text && !(Number.isFinite(c.rate) && c.rate > 0));
    if (bad) return Alert.alert('Check the details', `The rate for ${bad.code} must be a number greater than zero.`);
    const ok = update((s) =>
      changes.reduce((next, c) => (c.text ? upsert(next, 'rates', { id: c.code, base, rate: c.rate }) : remove(next, 'rates', c.code)), s),
    );
    if (ok) { setDrafts({}); Alert.alert('Rates saved'); }
  };

  const changeBase = (code: string) => {
    if (code === base) return;
    confirm(`Show totals in ${code}?`, 'Past amounts are converted using the rates you enter. Check them after switching.', 'Switch', () => {
      setDrafts({});
      update((s) => ({ ...s, settings: { ...s.settings, baseCurrency: code } }));
    });
  };

  return (
    <Screen>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button icon="checkmark" variant="prominent" accessibilityLabel="Save rates" hidden={needed.length === 0} onPress={save} />
      </Stack.Toolbar>
      <Card title="Main currency">
        <Chips value={base} onChange={changeBase} options={[...new Set([base, ...CURRENCIES])].map((c) => ({ value: c, label: c }))} />
      </Card>
      {needed.length ? (
        <Card title="Exchange rates">
          {needed.map((code) => (
            <Field key={code} label={`1 ${code} in ${base}`} value={drafts[code] ?? stored(code)} onChangeText={(v) => setDrafts((d) => ({ ...d, [code]: v }))} keyboardType="decimal-pad" placeholder="Not set" />
          ))}
        </Card>
      ) : null}
      <Card title="Add another currency">
        <Chips value={''} onChange={(c) => setAdded((a) => [...a, c])} options={CURRENCIES.filter((c) => c !== base && !needed.includes(c)).map((c) => ({ value: c, label: c }))} />
      </Card>
      <Note>Rates are entered by you; the app never connects to the internet to fetch them. Saved transactions keep the value they had when entered.</Note>
    </Screen>
  );
}
