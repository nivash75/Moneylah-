import { useState } from 'react';
import { Alert, Linking } from 'react-native';
import { remove, upsert } from '../core/actions';
import { CURRENCIES } from '../core/money';
import { multiCurrency } from '../data/features';
import { formatDateTime } from '../data/preferences';
import { useRefreshRates } from '../data/rates';
import { useLedger } from '../data/store';
import { HeaderButton } from '../ui/HeaderButton';
import { Card, Chips, confirm, decimalSeparator, Field, Note, Row, Screen } from '../ui/kit';
import { MainCurrency } from '../ui/MainCurrency';
import { Toggle } from '../ui/Toggle';

export default function Currencies() {
  return multiCurrency ? <ExchangeRates /> : <MainCurrency />;
}

function ExchangeRates() {
  const { state, update } = useLedger();
  const separator = decimalSeparator();
  const base = state.settings.baseCurrency;
  const { autoRates, ratesUpdated } = state.settings;
  const refresh = useRefreshRates();
  const updatedText = ratesUpdated ? `Updated ${formatDateTime(ratesUpdated)}` : 'Not updated yet';
  /** "1 base in code", as shown on the transaction form. */
  const perBase = (code: string) => {
    const rate = state.rates.find((r) => r.id === code && r.base === base);
    return rate ? String(Number((1 / rate.rate).toPrecision(6))).replace('.', separator) : 'Not available';
  };
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
    confirm(`Show totals in ${code}?`, autoRates ? "Past amounts are converted using today's rates." : 'Past amounts are converted using the rates you enter. Check them after switching.', 'Switch', () => {
      setDrafts({});
      update((s) => ({ ...s, settings: { ...s.settings, baseCurrency: code } }));
    });
  };

  return (
    <Screen>
      <HeaderButton placement="right" icon="checkmark" label="Save rates" hidden={autoRates || needed.length === 0} onPress={save} />
      <Card title="Main currency">
        <Chips value={base} onChange={changeBase} options={[...new Set([base, ...CURRENCIES])].map((c) => ({ value: c, label: c }))} />
      </Card>
      <Card>
        <Row icon="sync" title="Use today's rates">
          <Toggle accessibilityLabel="Use today's rates" value={autoRates} onValueChange={(on) => { setDrafts({}); update((s) => ({ ...s, settings: { ...s.settings, autoRates: on, ratesUpdated: 0 } })); }} />
        </Row>
        {autoRates && needed.length ? <Row icon="refresh" title="Update now" subtitle={updatedText} onPress={() => void refresh().catch(() => Alert.alert('Could not update rates', 'Check your internet connection and try again.'))} /> : null}
      </Card>
      {needed.length && autoRates ? (
        <Card title="Exchange rates">
          {needed.map((code) => <Row key={code} title={`1 ${base} in ${code}`} value={perBase(code)} />)}
        </Card>
      ) : null}
      {needed.length && !autoRates ? (
        <Card title="Exchange rates">
          {needed.map((code) => (
            <Field key={code} label={`1 ${code} in ${base}`} value={drafts[code] ?? stored(code)} onChangeText={(v) => setDrafts((d) => ({ ...d, [code]: v }))} keyboardType="decimal-pad" placeholder="Not set" />
          ))}
        </Card>
      ) : null}
      {autoRates ? null : (
        <Card title="Add another currency">
          <Chips value={''} onChange={(c) => setAdded((a) => [...a, c])} options={CURRENCIES.filter((c) => c !== base && !needed.includes(c)).map((c) => ({ value: c, label: c }))} />
        </Card>
      )}
      <Note>{autoRates ? "Rates are downloaded daily; only your main currency code is sent. Your bank's rate may differ." : 'Rates are entered by you and nothing is downloaded.'} Saved transactions keep the value they had when entered.</Note>
      {autoRates ? <Card><Row icon="open-outline" title="Rates by Exchange Rate API" onPress={() => void Linking.openURL('https://www.exchangerate-api.com')} /></Card> : null}
    </Screen>
  );
}
