import { useState } from 'react';
import { Alert, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { randomUUID } from 'expo-crypto';
import { remove, upsert } from '../core/actions';
import { format, parseAmount, plain } from '../core/money';
import type { TxnKind } from '../core/types';
import { useLedger } from '../data/store';
import { accountIcon } from '../ui/accounts';
import { Button, Card, Chips, confirm, decimalSeparator, Field, Note, Row, Screen, Segmented } from '../ui/kit';

export default function TxnForm() {
  const params = useLocalSearchParams<{ id?: string; date?: string; payTo?: string; amount?: string }>();
  const { state, update, accounts, categories, converter } = useLedger();
  const separator = decimalSeparator();
  const [existing] = useState(() => state.txns.find((t) => t.id === params.id));
  const base = state.settings.baseCurrency;
  const usable = state.accounts.filter((a) => !a.archived || a.id === existing?.accountId || a.id === existing?.toAccountId);
  const payCard = params.payTo ? accounts.get(params.payTo) : undefined;
  const text = (minor: number, accountId?: string | null) => plain(minor, accounts.get(accountId ?? '')?.currency ?? base, separator);

  const [kind, setKind] = useState<TxnKind>(existing?.kind ?? (payCard ? 'transfer' : 'expense'));
  const [date, setDate] = useState(() => {
    if (existing) return new Date(existing.date);
    const now = new Date();
    if (!params.date) return now;
    const day = new Date(Number(params.date));
    day.setHours(now.getHours(), now.getMinutes());
    return day;
  });
  const [accountId, setAccountId] = useState(() => existing?.accountId ?? (usable.find((a) => a.id !== payCard?.id && a.kind === 'bank' && payCard) ?? usable.find((a) => a.id !== payCard?.id))?.id ?? '');
  const [toAccountId, setToAccountId] = useState(existing?.toAccountId ?? payCard?.id ?? null);
  const [amountText, setAmountText] = useState(() => {
    if (existing) return text(existing.amount, existing.accountId);
    // A prefilled card payment is only valid when the paying account uses the card's currency.
    if (payCard && accounts.get(accountId)?.currency === payCard.currency) return text(Number(params.amount), payCard.id);
    return '';
  });
  const [toText, setToText] = useState(() => {
    if (existing?.kind === 'transfer') return text(existing.toAmount, existing.toAccountId);
    return payCard ? text(Number(params.amount), payCard.id) : '';
  });
  /** null means "follow the exchange rate". */
  const [baseText, setBaseText] = useState<string | null>(() =>
    existing && existing.baseCurrency === base ? plain(existing.baseAmount, base, separator) : null,
  );
  const [categoryId, setCategoryId] = useState(existing?.categoryId ?? null);
  const [note, setNote] = useState(existing?.note ?? '');

  const from = accounts.get(accountId);
  const to = toAccountId ? accounts.get(toAccountId) : undefined;
  const currency = from?.currency ?? base;
  const amount = parseAmount(amountText, currency, separator);
  const crossCurrency = kind === 'transfer' && !!to && to.currency !== currency;
  const foreign = kind !== 'transfer' && currency !== base;
  const converted = amount === null ? null : converter.convert(amount, currency);
  const baseShown = baseText ?? (converted === null ? '' : plain(converted, base, separator));

  const roots = state.categories.filter((c) => c.kind === kind && !c.parentId).sort((a, b) => a.order - b.order);
  const selected = categoryId ? categories.get(categoryId) : undefined;
  const rootId = selected?.parentId ?? selected?.id ?? null;
  const children = state.categories.filter((c) => c.parentId === rootId && rootId !== null).sort((a, b) => a.order - b.order);
  const accountOptions = usable.map((a) => ({ value: a.id, label: usable.some((b) => b.currency !== a.currency) ? `${a.name} (${a.currency})` : a.name, icon: accountIcon(a.kind) }));

  const save = () => {
    const fail = (message: string) => Alert.alert('Check the details', message);
    if (!from) return fail('Choose an account.');
    if (amount === null || amount <= 0) return fail('Enter an amount greater than zero.');
    let toAmount = 0;
    if (kind === 'transfer') {
      if (!to || to.id === from.id) return fail('Choose a different account to transfer to.');
      const received = crossCurrency ? parseAmount(toText, to.currency, separator) : amount;
      if (received === null || received <= 0) return fail(`Enter the amount received in ${to.currency}.`);
      toAmount = received;
    }
    let baseAmount = currency === base ? amount : (converted ?? 0);
    if (foreign) {
      const typed = parseAmount(baseShown, base, separator);
      if (typed === null || typed <= 0) return fail(`Enter the value in ${base}, or add an exchange rate in Settings.`);
      baseAmount = typed;
    }
    const saved = update((s) =>
      upsert(s, 'txns', {
        id: existing?.id ?? randomUUID(), kind, date: date.getTime(), amount, toAmount, baseAmount, baseCurrency: base, note: note.trim(),
        accountId: from.id, toAccountId: kind === 'transfer' ? to!.id : null,
        categoryId: kind !== 'transfer' && selected?.kind === kind ? selected.id : null,
      }),
    );
    if (saved) router.back();
  };

  return (
    <>
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button icon="xmark" accessibilityLabel="Cancel" onPress={() => router.back()} />
      </Stack.Toolbar>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button icon="checkmark" variant="prominent" accessibilityLabel="Save" onPress={save} />
      </Stack.Toolbar>
      <Screen>
        <Stack.Screen options={{ title: existing ? 'Edit transaction' : 'New transaction' }} />
        <Segmented value={kind} onChange={setKind} options={[{ value: 'expense', label: 'Expense' }, { value: 'income', label: 'Income' }, { value: 'transfer', label: 'Transfer' }]} />
        <Card>
          <Field label={`Amount (${currency})`} value={amountText} onChangeText={(v) => { setAmountText(v); setBaseText(null); }} keyboardType="decimal-pad" placeholder="0" autoFocus={!existing} />
          {foreign ? <Field label={`Value in ${base}`} value={baseShown} onChangeText={setBaseText} keyboardType="decimal-pad" placeholder="0" /> : null}
          <Row title="Date">
            <DateTimePicker value={date} mode="datetime" display="compact" onValueChange={(_, d) => setDate(d)} />
          </Row>
        </Card>
        <Card title={kind === 'transfer' ? 'From' : 'Account'}>
          <Chips value={accountId} onChange={(v) => { setAccountId(v); setBaseText(null); }} options={accountOptions} />
        </Card>
        {kind === 'transfer' ? (
          <Card title="To">
            <Chips value={toAccountId ?? ''} onChange={setToAccountId} options={accountOptions.filter((o) => o.value !== accountId)} />
            {crossCurrency ? <Field label={`Received (${to!.currency})`} value={toText} onChangeText={setToText} keyboardType="decimal-pad" placeholder="0" /> : null}
          </Card>
        ) : (
          <Card title="Category">
            <Chips value={rootId} onChange={setCategoryId} options={roots.map((c) => ({ value: c.id, label: c.name, icon: c.icon }))} />
            {selected?.kind === kind && children.length ? (
              <View>
                <Chips value={categoryId} onChange={setCategoryId} options={[{ value: rootId, label: 'General' }, ...children.map((c) => ({ value: c.id, label: c.name }))]} />
              </View>
            ) : null}
          </Card>
        )}
        {payCard && to ? <Note>Still to pay: {format(Number(params.amount), to.currency)}</Note> : null}
        <Card><Field label="Note" value={note} onChangeText={setNote} placeholder="Optional" maxLength={500} /></Card>
        {existing ? (
          <Button kind="danger" title="Delete" onPress={() => confirm('Delete transaction?', 'This cannot be undone.', 'Delete', () => { if (update((s) => remove(s, 'txns', existing.id))) router.back(); })} />
        ) : null}
      </Screen>
    </>
  );
}
