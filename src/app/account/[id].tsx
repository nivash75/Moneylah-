import { router, Stack, useLocalSearchParams } from 'expo-router';
import { balance, cardStatement, endOfDay } from '../../core/ledger';
import { format } from '../../core/money';
import { useLedger } from '../../data/store';
import { Button, Card, Note, Row, Screen } from '../../ui/kit';
import { TxnRow } from '../../ui/TxnRow';

const date = (ms: number) => new Date(ms).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

export default function AccountDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, accounts } = useLedger();
  const account = accounts.get(id);
  if (!account) return <Screen><Note>This account no longer exists.</Note></Screen>;

  const money = (v: number) => format(v, account.currency);
  const history = state.txns.filter((t) => t.accountId === id || t.toAccountId === id).sort((a, b) => b.date - a.date);
  const current = balance(account, state.txns, endOfDay(Date.now()));
  const card = account.kind === 'card' ? cardStatement(account, state.txns) : null;

  return (
    <Screen>
      <Stack.Screen options={{ title: account.name }} />
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button icon="pencil" accessibilityLabel="Edit account" onPress={() => router.push({ pathname: '/account-form', params: { id } })} />
      </Stack.Toolbar>
      <Card>
        <Row title="Balance today" value={money(current)} />
        {card && account.creditLimit > 0 ? <Row title="Available credit" value={money(account.creditLimit + Math.min(current, 0))} /> : null}
      </Card>
      {card ? (
        <Card title="Card statement">
          <Row title="Last statement" subtitle={`Closed ${date(card.closeDate)}`} value={money(card.statementAmount)} />
          <Row title="Still to pay" subtitle={`Due ${date(card.dueDate)}`} value={money(card.remaining)} />
          <Row title="New charges" subtitle={`Next statement ${date(card.nextCloseDate)}`} value={money(card.newCharges)} />
        </Card>
      ) : null}
      {card && card.remaining > 0 ? (
        <Button title="Record card payment" onPress={() => router.push({ pathname: '/txn', params: { payTo: id, amount: String(card.remaining) } })} />
      ) : null}
      <Card title="Transactions">
        {history.slice(0, 200).map((t) => <TxnRow key={t.id} txn={t} showDate />)}
        {history.length === 0 ? <Row title="No transactions yet" /> : null}
      </Card>
      {history.length > 200 ? <Note>Showing the latest 200. Export CSV for the full history.</Note> : null}
    </Screen>
  );
}
