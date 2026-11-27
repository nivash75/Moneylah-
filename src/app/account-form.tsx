import { useState } from 'react';
import { Alert, Switch } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { randomUUID } from 'expo-crypto';
import { accountInUse, removeAccount, upsert } from '../core/actions';
import { CURRENCIES, parseAmount, plain } from '../core/money';
import { ACCOUNT_KINDS, type AccountKind } from '../core/types';
import { useLedger } from '../data/store';
import { HeaderButton } from '../ui/HeaderButton';
import { accountIcon, accountTitle } from '../ui/accounts';
import { Button, Card, Chips, confirm, decimalSeparator, Field, Note, Row, Screen } from '../ui/kit';

export default function AccountForm() {
  const params = useLocalSearchParams<{ id?: string }>();
  const { state, update, accounts } = useLedger();
  const separator = decimalSeparator();
  const [existing] = useState(() => (params.id ? accounts.get(params.id) : undefined));
  const used = existing ? accountInUse(state, existing.id) : false;
  const money = (minor: number) => plain(minor, existing?.currency ?? state.settings.baseCurrency, separator);

  const [name, setName] = useState(existing?.name ?? '');
  const [kind, setKind] = useState<AccountKind>(existing?.kind ?? 'bank');
  const [currency, setCurrency] = useState(existing?.currency ?? state.settings.baseCurrency);
  const [opening, setOpening] = useState(existing?.opening ? money(existing.opening) : '');
  const [includeInTotal, setInclude] = useState(existing?.includeInTotal ?? true);
  const [archived, setArchived] = useState(existing?.archived ?? false);
  const [statementDay, setStatementDay] = useState(String(existing?.statementDay ?? 1));
  const [paymentDay, setPaymentDay] = useState(String(existing?.paymentDay ?? 15));
  const [limit, setLimit] = useState(existing?.creditLimit ? money(existing.creditLimit) : '');
  const currencies = [...new Set([currency, state.settings.baseCurrency, ...CURRENCIES])];

  const save = () => {
    const fail = (message: string) => Alert.alert('Check the details', message);
    if (!name.trim()) return fail('Enter an account name.');
    const openingMinor = opening.trim() ? parseAmount(opening, currency, separator) : 0;
    if (openingMinor === null) return fail('The opening balance is not a valid amount.');
    const limitMinor = limit.trim() ? parseAmount(limit, currency, separator) : 0;
    if (limitMinor === null || limitMinor < 0) return fail('The credit limit is not a valid amount.');
    const days = [Number(statementDay), Number(paymentDay)];
    if (kind === 'card' && !days.every((d) => Number.isInteger(d) && d >= 1 && d <= 31)) return fail('Days must be between 1 and 31.');
    const ok = update((s) =>
      upsert(s, 'accounts', {
        id: existing?.id ?? randomUUID(), name: name.trim(), kind, currency, opening: openingMinor, includeInTotal, archived,
        statementDay: kind === 'card' ? days[0] : 1, paymentDay: kind === 'card' ? days[1] : 15, creditLimit: kind === 'card' ? limitMinor : 0,
      }),
    );
    if (ok) router.back();
  };

  return (
    <>
      <HeaderButton placement="left" icon="xmark" label="Cancel" onPress={() => router.back()} />
      <HeaderButton placement="right" icon="checkmark" label="Save" onPress={save} />
      <Screen>
        <Card><Field label="Name" value={name} onChangeText={setName} placeholder="e.g. Savings" maxLength={60} /></Card>
        <Card title="Type"><Chips value={kind} onChange={setKind} options={ACCOUNT_KINDS.map((k) => ({ value: k, label: accountTitle(k), icon: accountIcon(k) }))} /></Card>
        <Card title="Currency"><Chips value={currency} onChange={setCurrency} disabled={used} options={currencies.map((c) => ({ value: c, label: c }))} /></Card>
        {used ? <Note>The currency is fixed because this account has transactions.</Note> : null}
        <Card>
          <Field label="Opening balance" value={opening} onChangeText={setOpening} keyboardType="numbers-and-punctuation" placeholder="0" />
          <Row title="Include in net worth"><Switch value={includeInTotal} onValueChange={setInclude} /></Row>
          {existing ? <Row title="Archived"><Switch value={archived} onValueChange={setArchived} /></Row> : null}
        </Card>
        {kind === 'card' ? (
          <>
            <Card title="Credit card">
              <Field label="Statement day" value={statementDay} onChangeText={setStatementDay} keyboardType="number-pad" />
              <Field label="Payment due day" value={paymentDay} onChangeText={setPaymentDay} keyboardType="number-pad" />
              <Field label="Credit limit" value={limit} onChangeText={setLimit} keyboardType="decimal-pad" placeholder="Optional" />
            </Card>
            <Note>Enter money already owed as a negative opening balance. Day 31 means the last day of shorter months.</Note>
          </>
        ) : null}
        {existing && !used ? (
          <Button kind="danger" title="Delete account" onPress={() => confirm('Delete account?', 'This cannot be undone.', 'Delete', () => { if (update((s) => removeAccount(s, existing.id))) router.dismissTo('/accounts'); })} />
        ) : null}
      </Screen>
    </>
  );
}
