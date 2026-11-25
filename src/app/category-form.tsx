import { useState } from 'react';
import { Alert } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { randomUUID } from 'expo-crypto';
import { removeCategory, upsert } from '../core/actions';
import { useLedger } from '../data/store';
import { Button, Card, Chips, confirm, Field, Screen } from '../ui/kit';

const ICONS = ['pricetag', 'restaurant', 'cafe', 'cart', 'bag', 'home', 'bus', 'car', 'airplane', 'medkit', 'fitness', 'film', 'game-controller', 'book', 'school', 'gift', 'paw', 'phone-portrait', 'wifi', 'flash', 'shirt', 'briefcase', 'star', 'trending-up', 'add-circle', 'heart', 'ellipsis-horizontal-circle'];

export default function CategoryForm() {
  const params = useLocalSearchParams<{ id?: string; kind?: 'expense' | 'income' }>();
  const { state, update, categories } = useLedger();
  const [existing] = useState(() => (params.id ? categories.get(params.id) : undefined));
  const kind = existing?.kind ?? (params.kind === 'income' ? 'income' : 'expense');
  const [name, setName] = useState(existing?.name ?? '');
  const [icon, setIcon] = useState(existing?.icon ?? 'pricetag');
  const [parentId, setParentId] = useState(existing?.parentId ?? null);
  const hasChildren = !!existing && state.categories.some((c) => c.parentId === existing.id);
  const parents = state.categories.filter((c) => c.kind === kind && !c.parentId && c.id !== existing?.id);

  const save = () => {
    if (!name.trim()) return Alert.alert('Check the details', 'Enter a category name.');
    const ok = update((s) =>
      upsert(s, 'categories', { id: existing?.id ?? randomUUID(), name: name.trim(), icon, kind, parentId, order: existing?.order ?? s.categories.length }),
    );
    if (ok) router.back();
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
        <Card><Field label="Name" value={name} onChangeText={setName} maxLength={40} placeholder={kind === 'income' ? 'Income category' : 'Expense category'} /></Card>
        {!hasChildren ? (
          <Card title="Inside">
            <Chips value={parentId} onChange={setParentId} options={[{ value: null, label: 'Top level' }, ...parents.map((c) => ({ value: c.id as string | null, label: c.name }))]} />
          </Card>
        ) : null}
        <Card title="Icon"><Chips value={icon} onChange={setIcon} options={ICONS.map((i) => ({ value: i, label: '', icon: i }))} /></Card>
        {existing ? (
          <Button kind="danger" title="Delete category" onPress={() => confirm('Delete category?', 'Its subcategories and budgets are deleted too. Transactions are kept as uncategorised.', 'Delete', () => { if (update((s) => removeCategory(s, existing.id))) router.back(); })} />
        ) : null}
      </Screen>
    </>
  );
}
