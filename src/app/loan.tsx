import { useState } from 'react';
import { Alert } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { randomUUID } from 'expo-crypto';
import { upsert } from '../core/actions';
import { loanStatus } from '../core/loans';
import { format, parseAmount, plain } from '../core/money';
import { account as newAccount } from '../core/seed';
import { pickerLocale } from '../data/preferences';
import { allowReminders } from '../data/reminders';
import { useLedger } from '../data/store';
import { accountIcon } from '../ui/accounts';
import { DueDate } from '../ui/DueDate';
import { Card, Chips, decimalSeparator, Field, Note, Row, Screen, Segmented } from '../ui/kit';

/** Lends, borrows or repays: each is a transfer between one of your accounts and a person. */
export default function LoanForm() {
  const params = useLocalSearchParams<{ person?: string; type?: 'lend' | 'borrow'; repay?: string }>();
  const { state, update, accounts, converter } = useLedger();
  const separator = decimalSeparator();
  const [repaying] = useState(() => (params.repay ? accounts.get(params.repay) : undefined));
  const [owed] = useState(() => (repaying ? loanStatus(repaying, state.txns).balance : 0));
  const people = state.accounts.filter((a) => a.kind === 'person' && !a.archived);

  const [type, setType] = useState<'lend' | 'borrow'>(params.type === 'borrow' ? 'borrow' : 'lend');
  const [personId, setPersonId] = useState<string | null>(() => repaying?.id ?? (params.person && accounts.has(params.person) ? params.person : null));
  const [name, setName] = useState('');
  const person = personId ? accounts.get(personId) : undefined;
  // A person's balance has one currency, so the money account must use it too.
  const money = state.accounts.filter((a) => !a.archived && a.kind !== 'person' && (!person || a.currency === person.currency));
  const [picked, setAccountId] = useState(() => money.find((a) => a.kind === 'bank')?.id ?? money[0]?.id ?? '');
  const mine = money.find((a) => a.id === picked) ?? money[0];
  const currency = person?.currency ?? mine?.currency ?? state.settings.baseCurrency;
  const [amountText, setAmountText] = useState(() => (repaying && owed ? plain(Math.abs(owed), repaying.currency, separator) : ''));
  const [date, setDate] = useState(() => new Date());
  const [dueDate, setDueDate] = useState<number | null>(null);
  const [note, setNote] = useState('');

  // Money leaves your account when you lend, or when you repay what you borrowed.
  const outgoing = repaying ? owed < 0 : type === 'lend';

  const save = () => {
    const fail = (message: string) => Alert.alert('Check the details', message);
    if (!mine) return fail(`Add an account that uses ${currency} first.`);
    const typed = name.trim();
    if (!person && !typed) return fail('Enter who this is with.');
    const amount = parseAmount(amountText, currency, separator);
    if (amount === null || amount <= 0) return fail('Enter an amount greater than zero.');
    if (repaying && amount > Math.abs(owed)) return fail(`Only ${format(Math.abs(owed), currency)} is outstanding.`);
    if (!repaying && dueDate !== null && dueDate < new Date(date).setHours(0, 0, 0, 0)) return fail('The due date is before the date of the loan.');
    // The same name in the same currency is the same person, even if archived.
    const other = person
      ?? state.accounts.find((p) => p.kind === 'person' && p.currency === currency && p.name.trim().toLowerCase() === typed.toLowerCase())
      ?? newAccount(randomUUID(), typed, 'person', currency);
    const saved = update((s) => {
      const next = !accounts.has(other.id) || other.archived ? upsert(s, 'accounts', { ...other, archived: false }) : s;
      return upsert(next, 'txns', {
        id: randomUUID(), kind: 'transfer', date: date.getTime(), amount, toAmount: amount,
        baseAmount: converter.convert(amount, currency) ?? 0, baseCurrency: converter.base, note: note.trim(),
        accountId: outgoing ? mine.id : other.id, toAccountId: outgoing ? other.id : mine.id, categoryId: null,
        loan: repaying ? 'repayment' : type,
        ...(!repaying && dueDate !== null ? { dueDate } : {}),
      });
    });
    if (!saved) return;
    if (!repaying && dueDate !== null) void allowReminders().catch(() => {});
    router.back();
  };

  const title = repaying ? (owed < 0 ? `Repay ${repaying.name}` : `${repaying.name} repays you`) : 'Lend or borrow';

  return (
    <>
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button icon="xmark" accessibilityLabel="Cancel" onPress={() => router.back()} />
      </Stack.Toolbar>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button icon="checkmark" variant="prominent" accessibilityLabel="Save" onPress={save} />
      </Stack.Toolbar>
      <Screen>
        <Stack.Screen options={{ title }} />
        {repaying ? null : <Segmented value={type} onChange={setType} options={[{ value: 'lend', label: 'I lend' }, { value: 'borrow', label: 'I borrow' }]} />}
        {repaying ? null : (
          <Card title={type === 'lend' ? 'To' : 'From'}>
            {people.length ? <Chips value={personId} onChange={setPersonId} options={[{ value: null as string | null, label: 'New person' }, ...people.map((p) => ({ value: p.id as string | null, label: p.name }))]} /> : null}
            {person ? null : <Field label="Name" value={name} onChangeText={setName} placeholder="e.g. Alex" maxLength={60} />}
          </Card>
        )}
        <Card>
          <Field label={`Amount (${currency})`} value={amountText} onChangeText={setAmountText} keyboardType="decimal-pad" placeholder="0" />
          <Row title="Date">
            <DateTimePicker value={date} mode="datetime" display="compact" locale={pickerLocale()} onValueChange={(_, d) => setDate(d)} />
          </Row>
          {repaying ? null : <DueDate value={dueDate} onChange={setDueDate} from={date} />}
        </Card>
        <Card title={outgoing ? 'Paid from' : 'Received into'}>
          <Chips value={mine?.id ?? ''} onChange={setAccountId} options={money.map((a) => ({ value: a.id, label: `${a.name} (${a.currency})`, icon: accountIcon(a.kind) }))} />
        </Card>
        <Card><Field label="Note" value={note} onChangeText={setNote} placeholder="Optional" maxLength={500} /></Card>
        <Note>This moves money between accounts. It doesn't count as income or spending.</Note>
      </Screen>
    </>
  );
}
