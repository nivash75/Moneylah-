import { View } from 'react-native';
import { router } from 'expo-router';
import type { Txn } from '../core/types';
import { categoryName } from '../core/ledger';
import { format } from '../core/money';
import { useLedger } from '../data/store';
import { Row, T, useTheme } from './kit';

export function TxnRow({ txn, showDate }: { txn: Txn; showDate?: boolean }) {
  const { accounts, categories, state } = useLedger();
  const theme = useTheme();
  const from = accounts.get(txn.accountId);
  const to = txn.toAccountId ? accounts.get(txn.toAccountId) : undefined;
  const transfer = txn.kind === 'transfer';
  const person = from?.kind === 'person' ? from : to?.kind === 'person' ? to : undefined;
  const loanTitle = !person ? null
    : txn.loan === 'repayment' ? (person === from ? `${person.name} repaid you` : `Repaid ${person.name}`)
    : person === to ? `Lent to ${person.name}` : `Borrowed from ${person.name}`;
  const title = transfer ? (loanTitle ?? 'Transfer') : categoryName(txn.categoryId, categories);
  const due = txn.dueDate ? `Due ${new Date(txn.dueDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}` : undefined;
  const route = transfer ? `${from?.name} → ${to?.name}` : from?.name;
  const date = showDate ? new Date(txn.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : undefined;
  return (
    <Row
      icon={person ? 'people' : transfer ? 'swap-horizontal' : (txn.categoryId && categories.get(txn.categoryId)?.icon) || 'help'}
      title={title}
      subtitle={[date, route, due, txn.note].filter(Boolean).join(' · ')}
      value={format(txn.amount, from?.currency ?? state.settings.baseCurrency)}
      valueColor={txn.kind === 'income' ? theme.income : txn.kind === 'expense' ? theme.expense : theme.dim}
      onPress={() => router.push({ pathname: '/txn', params: { id: txn.id } })}
    />
  );
}

export function SummaryRow({ items }: { items: { label: string; value: string; color?: string }[] }) {
  return (
    <View style={{ flexDirection: 'row', paddingVertical: 8 }}>
      {items.map((i) => (
        <View key={i.label} style={{ flex: 1, gap: 2 }}>
          <T dim size={12} center>{i.label}</T>
          <T bold size={15} center color={i.color}>{i.value}</T>
        </View>
      ))}
    </View>
  );
}
