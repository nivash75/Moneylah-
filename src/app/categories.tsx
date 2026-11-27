import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useLedger } from '../data/store';
import { HeaderButton } from '../ui/HeaderButton';
import { Card, Row, Screen, Segmented } from '../ui/kit';

export default function Categories() {
  const { state } = useLedger();
  const [kind, setKind] = useState<'expense' | 'income'>('expense');
  const sorted = state.categories.filter((c) => c.kind === kind).sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
  const edit = (id: string) => router.push({ pathname: '/category-form', params: { id } });
  return (
    <Screen>
      <HeaderButton placement="right" icon="plus" label="Add category" onPress={() => router.push({ pathname: '/category-form', params: { kind } })} />
      <Segmented value={kind} onChange={setKind} options={[{ value: 'expense', label: 'Expense' }, { value: 'income', label: 'Income' }]} />
      {sorted.filter((c) => !c.parentId).map((root) => (
        <Card key={root.id}>
          <Row icon={root.icon} title={root.name} onPress={() => edit(root.id)} />
          {sorted.filter((c) => c.parentId === root.id).map((c) => (
            <View key={c.id} style={{ paddingLeft: 28 }}><Row icon={c.icon} title={c.name} onPress={() => edit(c.id)} /></View>
          ))}
        </Card>
      ))}
    </Screen>
  );
}
