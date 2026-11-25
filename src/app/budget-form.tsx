import { useState } from 'react';
import { Alert } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { randomUUID } from 'expo-crypto';
import { remove, upsert } from '../core/actions';
import { categoryName } from '../core/ledger';
import { parseAmount, plain } from '../core/money';
import { useLedger } from '../data/store';
import { Button, Card, Chips, confirm, decimalSeparator, Field, Note, Screen } from '../ui/kit';

export default function BudgetForm() {
  const params = useLocalSearchParams<{ id?: string }>();
  const { state, update, categories } = useLedger();
  const separator = decimalSeparator();
  const [existing] = useState(() => state.budgets.find((b) => b.id === params.id));
  const currency = existing?.currency ?? state.settings.baseCurrency;
  const taken = new Set(state.budgets.filter((b) => b.id !== existing?.id).map((b) => b.categoryId));
  const options = [
    { value: null as string | null, label: 'All spending' },
    ...state.categories.filter((c) => c.kind === 'expense').sort((a, b) => categoryName(a.id, categories).localeCompare(categoryName(b.id, categories))).map((c) => ({ value: c.id as string | null, label: categoryName(c.id, categories) })),
  ].filter((o) => !taken.has(o.value));
  const [categoryId, setCategoryId] = useState(existing ? existing.categoryId : (options[0]?.value ?? null));
  const [text, setText] = useState(existing ? plain(existing.amount, currency, separator) : '');

  const save = () => {
    const amount = parseAmount(text, currency, separator);
    if (amount === null || amount <= 0) return Alert.alert('Check the details', 'Enter an amount greater than zero.');
    if (taken.has(categoryId)) return Alert.alert('Check the details', 'That already has a budget.');
    if (update((s) => upsert(s, 'budgets', { id: existing?.id ?? randomUUID(), amount, currency, categoryId }))) router.back();
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
        <Card><Field label={`Monthly limit (${currency})`} value={text} onChangeText={setText} keyboardType="decimal-pad" placeholder="0" autoFocus={!existing} /></Card>
        <Card title="Applies to"><Chips value={categoryId} onChange={setCategoryId} options={options} /></Card>
        <Note>The same limit applies to every month.</Note>
        {existing ? (
          <Button kind="danger" title="Delete budget" onPress={() => confirm('Delete budget?', 'Your transactions are not affected.', 'Delete', () => { if (update((s) => remove(s, 'budgets', existing.id))) router.back(); })} />
        ) : null}
      </Screen>
    </>
  );
}
