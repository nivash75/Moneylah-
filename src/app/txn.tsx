import { useState } from 'react';
import { Alert, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { randomUUID } from 'expo-crypto';
import { remove, upsert } from '../core/actions';
import { convertAt, digits, format, parseAmount, plain, rateBetween } from '../core/money';
import type { TxnKind } from '../core/types';
import { allowReminders } from '../data/reminders';
import { useLedger } from '../data/store';
import { DateField } from '../ui/DateField';
import { HeaderButton } from '../ui/HeaderButton';
import { accountIcon } from '../ui/accounts';
import { DueDate } from '../ui/DueDate';
import { Button, Card, Chips, confirm, decimalSeparator, Field, Note, Row, Screen, Segmented } from '../ui/kit';

export default function TxnForm() {
  const params = useLocalSearchParams<{ id?: string; date?: string; payTo?: string; amount?: string }>();
  const { state, update, accounts, categories, converter } = useLedger();
  const separator = decimalSeparator();
  const [existing] = useState(() => state.txns.find((t) => t.id === params.id));
  const base = state.settings.baseCurrency;
  // People appear only on their own loans; new ones are entered through Lend or borrow.
  const usable = state.accounts.filter((a) => (!a.archived && a.kind !== 'person') || a.id === existing?.accountId || a.id === existing?.toAccountId);
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
  /** null means "follow the exchange rate". */
  const [toText, setToText] = useState<string | null>(() => {
    if (existing?.kind === 'transfer') return text(existing.toAmount, existing.toAccountId);
    return payCard ? text(Number(params.amount), payCard.id) : null;
  });
  /** null means no rate has been typed here. */
  const [rateText, setRateText] = useState<string | null>(null);
  /** null means "follow the exchange rate". */
  const [baseText, setBaseText] = useState<string | null>(() =>
    existing && existing.baseCurrency === base ? plain(existing.baseAmount, base, separator) : null,
  );
  /** True while the amount may be filled in from the other currency, because none was typed. */
  const [amountAuto, setAmountAuto] = useState(() => amountText === '');
  const [dueDate, setDueDate] = useState<number | null>(existing?.dueDate ?? null);
  const [categoryId, setCategoryId] = useState(existing?.categoryId ?? null);
  const [note, setNote] = useState(existing?.note ?? '');

  const from = accounts.get(accountId);
  const to = toAccountId ? accounts.get(toAccountId) : undefined;
  const currency = from?.currency ?? base;
  const amount = parseAmount(amountText, currency, separator);
  const crossCurrency = kind === 'transfer' && !!to && to.currency !== currency;
  const foreign = kind !== 'transfer' && currency !== base;
  // The other currency involved, if any, and the one the rate is quoted per.
  const target = crossCurrency ? to!.currency : foreign ? base : null;
  const unit = target === base || foreign ? base : currency;
  const other = unit === currency ? (target ?? base) : currency;
  const typedRate = rateText === null ? null : Number(rateText.trim().replace(separator, '.'));
  const converted = amount === null ? null : converter.convert(amount, currency);
  const followed = amount === null || target === null ? null : typedRate === null ? converter.convert(amount, currency, target) : convertAt(amount, currency, target, unit, typedRate);
  const followedText = followed === null || target === null ? '' : plain(followed, target, separator);
  const baseShown = baseText ?? followedText;
  const toShown = toText ?? followedText;

  /** The typed rate, else the one the typed amounts imply, else the saved one. */
  const rateShown = () => {
    if (rateText !== null) return rateText;
    if (target === null) return '';
    const display = (rate: number) => (Number.isFinite(rate) && rate > 0 ? String(Number(rate.toPrecision(6))).replace('.', separator) : '');
    const manual = amountAuto ? null : foreign ? baseText : toText;
    if (manual !== null) {
      const received = parseAmount(manual, target, separator);
      if (amount === null || amount <= 0 || received === null || received <= 0) return '';
      return display(unit === currency ? rateBetween(amount, unit, received, other) : rateBetween(received, unit, amount, other));
    }
    // A large sample keeps the precision of small rates.
    const sample = 1_000_000 * 10 ** digits(unit);
    const worth = converter.convert(sample, unit, other);
    return worth === null ? '' : display(rateBetween(sample, unit, worth, other));
  };
  /** Works the amount out from a value typed in the other currency. */
  const fillAmount = (value: string, rate: string | null) => {
    if (target === null) return;
    const minor = parseAmount(value, target, separator);
    const result = minor === null ? null : rate === null ? converter.convert(minor, target, currency) : convertAt(minor, target, currency, unit, Number(rate.trim().replace(separator, '.')));
    setAmountText(result === null ? '' : plain(result, currency, separator));
  };
  const typeTarget = (v: string) => {
    (foreign ? setBaseText : setToText)(v);
    if (amountAuto) fillAmount(v, rateText);
    else setRateText(null);
  };
  const typeRate = (v: string) => {
    setRateText(v);
    const value = foreign ? baseText : toText;
    // Keep whichever side was typed, and recalculate the other.
    if (amountAuto && value !== null) fillAmount(value, v);
    else { setBaseText(null); setToText(null); }
  };
  const resetRate = () => {
    setRateText(null); setBaseText(null); setToText(null);
    if (amountAuto) setAmountText('');
  };
  /** The received amount stays: it is in the destination's currency, which hasn't changed. */
  const changeAccount = (id: string) => {
    setAccountId(id); setRateText(null); setBaseText(null);
    if (amountAuto) setAmountText('');
  };

  const roots = state.categories.filter((c) => c.kind === kind && !c.parentId).sort((a, b) => a.order - b.order);
  const selected = categoryId ? categories.get(categoryId) : undefined;
  const rootId = selected?.parentId ?? selected?.id ?? null;
  const children = state.categories.filter((c) => c.parentId === rootId && rootId !== null).sort((a, b) => a.order - b.order);
  const accountOptions = usable.map((a) => ({ value: a.id, label: usable.some((b) => b.currency !== a.currency) ? `${a.name} (${a.currency})` : a.name, icon: accountIcon(a.kind) }));

  // With manual rates, one typed on a new entry is kept for next time; editing an old one leaves it alone.
  const remembered = !state.settings.autoRates && !existing && target !== null && unit === base && typedRate !== null && Number.isFinite(typedRate) && typedRate > 0;
  const rateField = target === null ? null : <Field label={`1 ${unit} in ${other}`} value={rateShown()} onChangeText={typeRate} keyboardType="decimal-pad" placeholder="Exchange rate" />;

  const isLoan = kind === 'transfer' && (from?.kind === 'person' || to?.kind === 'person');
  const canBeDue = isLoan && existing?.loan !== 'repayment';

  const save = () => {
    const fail = (message: string) => Alert.alert('Check the details', message);
    if (!from || (kind !== 'transfer' && from.kind === 'person')) return fail('Choose an account.');
    if (canBeDue && dueDate !== null && dueDate < new Date(date).setHours(0, 0, 0, 0)) return fail('The due date is before the date of the loan.');
    if (amount === null || amount <= 0) return fail('Enter an amount greater than zero.');
    let toAmount = 0;
    if (kind === 'transfer') {
      if (!to || to.id === from.id) return fail('Choose a different account to transfer to.');
      const received = crossCurrency ? parseAmount(toShown, to.currency, separator) : amount;
      if (received === null || received <= 0) return fail(`Enter the amount received in ${to.currency}.`);
      toAmount = received;
    }
    let baseAmount = currency === base ? amount : kind === 'transfer' && to?.currency === base ? toAmount : (converted ?? 0);
    if (target !== null && typedRate !== null && !(Number.isFinite(typedRate) && typedRate > 0)) return fail('The exchange rate must be a number greater than zero.');
    if (foreign) {
      const typed = parseAmount(baseShown, base, separator);
      if (typed === null || typed <= 0) return fail(`Enter the exchange rate or the value in ${base}.`);
      baseAmount = typed;
    }
    const saved = update((s) => {
      const next = upsert(s, 'txns', {
        id: existing?.id ?? randomUUID(), kind, date: date.getTime(), amount, toAmount, baseAmount, baseCurrency: base, note: note.trim(),
        accountId: from.id, toAccountId: kind === 'transfer' ? to!.id : null,
        categoryId: kind !== 'transfer' && selected?.kind === kind ? selected.id : null,
        ...(isLoan && existing?.loan ? { loan: existing.loan } : {}),
        ...(canBeDue && dueDate !== null ? { dueDate } : {}),
      });
      return remembered ? upsert(next, 'rates', { id: other, base, rate: Number((1 / typedRate!).toPrecision(10)) }) : next;
    });
    if (!saved) return;
    if (canBeDue && dueDate !== null) void allowReminders().catch(() => {});
    router.back();
  };

  return (
    <>
      <HeaderButton placement="left" icon="xmark" label="Cancel" onPress={() => router.back()} />
      <HeaderButton placement="right" icon="checkmark" label="Save" onPress={save} />
      <Screen>
        <Stack.Screen options={{ title: existing ? 'Edit transaction' : 'New transaction' }} />
        <Segmented value={kind} onChange={(v) => { setKind(v); if (amountAuto) resetRate(); else setRateText(null); }} options={[{ value: 'expense', label: 'Expense' }, { value: 'income', label: 'Income' }, { value: 'transfer', label: 'Transfer' }]} />
        <Card>
          <Field label={`Amount (${currency})`} value={amountText} onChangeText={(v) => { setAmountText(v); setAmountAuto(v === ''); setBaseText(null); }} keyboardType="decimal-pad" placeholder="0" autoFocus={!existing} />
          {foreign ? rateField : null}
          {foreign ? <Field label={`Value in ${base}`} value={baseShown} onChangeText={typeTarget} keyboardType="decimal-pad" placeholder="0" /> : null}
          <Row title="Date">
            <DateField value={date} mode="datetime" onChange={setDate} />
          </Row>
        </Card>
        <Card title={kind === 'transfer' ? 'From' : 'Account'}>
          <Chips value={accountId} onChange={changeAccount} options={accountOptions} />
        </Card>
        {kind === 'transfer' ? (
          <Card title="To">
            <Chips value={toAccountId ?? ''} onChange={(v) => { setToAccountId(v); resetRate(); }} options={accountOptions.filter((o) => o.value !== accountId)} />
            {crossCurrency ? rateField : null}
            {crossCurrency ? <Field label={`Received (${to!.currency})`} value={toShown} onChangeText={typeTarget} keyboardType="decimal-pad" placeholder="0" /> : null}
          </Card>
        ) : (
          <Card title="Category">
            <Chips value={rootId} onChange={setCategoryId} options={roots.map((c) => ({ value: c.id, label: c.name, icon: c.icon }))} />
            {selected?.kind === kind && children.length ? (
              <View>
                <Chips value={categoryId} onChange={setCategoryId} options={[{ value: rootId, label: 'General' }, ...children.map((c) => ({ value: c.id, label: c.name, icon: c.icon }))]} />
              </View>
            ) : null}
          </Card>
        )}
        {target !== null && state.settings.autoRates && state.settings.ratesUpdated ? <Note>Rate updated {new Date(state.settings.ratesUpdated).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}. Change it if your bank used a different one.</Note> : null}
        {canBeDue ? <Card><DueDate value={dueDate} onChange={setDueDate} from={date} /></Card> : null}
        {kind === 'transfer' && !existing && !payCard ? <Card><Row icon="people" title="Lend or borrow money" subtitle="With a person and a return date" onPress={() => router.replace('/loan')} /></Card> : null}
        {remembered ? <Note>This rate will be saved for your next {other} entries.</Note> : null}
        {payCard && to ? <Note>Still to pay: {format(Number(params.amount), to.currency)}</Note> : null}
        <Card><Field label="Note" value={note} onChangeText={setNote} placeholder="Optional" maxLength={500} /></Card>
        {existing ? (
          <Button kind="danger" title="Delete" onPress={() => confirm('Delete transaction?', 'This cannot be undone.', 'Delete', () => { if (update((s) => remove(s, 'txns', existing.id))) router.back(); })} />
        ) : null}
      </Screen>
    </>
  );
}
