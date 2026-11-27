import { router, Stack } from 'expo-router';
import { balance, endOfDay } from '../../../core/ledger';
import { isOverdue, loanStatus } from '../../../core/loans';
import { format } from '../../../core/money';
import { ACCOUNT_KINDS } from '../../../core/types';
import { useLedger } from '../../../data/store';
import { accountIcon, accountTitle } from '../../../ui/accounts';
import { Card, Note, Row, Screen, useTheme } from '../../../ui/kit';
import { SummaryRow } from '../../../ui/TxnRow';

export default function Accounts() {
  const { state, converter } = useLedger();
  const theme = useTheme();
  const today = endOfDay(Date.now());
  const rows = state.accounts.map((account) => ({ account, balance: balance(account, state.txns, today) }));
  const upcoming = state.txns.some((t) => t.date > today);
  let assets = 0;
  let debts = 0;
  let missing = 0;
  for (const r of rows) {
    if (!r.account.includeInTotal || r.account.archived) continue;
    const value = converter.convert(r.balance, r.account.currency);
    if (value === null) missing++;
    else if (value >= 0) assets += value;
    else debts -= value;
  }
  const money = (v: number) => format(v, converter.base);
  const open = (id: string) => router.push({ pathname: '/account/[id]', params: { id } });
  const owing = (person: (typeof rows)[number]['account']) => {
    const status = loanStatus(person, state.txns);
    if (!status.balance) return 'Settled';
    const due = status.open[0]?.dueDate;
    const when = due ? ` · ${isOverdue(due) ? 'overdue since' : 'due'} ${new Date(due).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}` : '';
    return `${status.balance > 0 ? 'Owes you' : 'You owe'}${when}`;
  };
  const list = (items: typeof rows) =>
    items.map((r) => (
      <Row key={r.account.id} icon={accountIcon(r.account.kind)} title={r.account.name} subtitle={r.account.kind === 'person' ? owing(r.account) : undefined} value={format(r.balance, r.account.currency)} valueColor={r.balance < 0 ? theme.expense : undefined} onPress={() => open(r.account.id)} />
    ));
  const archived = rows.filter((r) => r.account.archived);

  return (
    <>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button icon="plus" accessibilityLabel="Add account" onPress={() => router.push('/account-form')} />
      </Stack.Toolbar>
      <Screen>
        <Card>
          <SummaryRow items={[
            { label: 'Assets', value: money(assets), color: theme.income },
            { label: 'Debts', value: money(debts), color: theme.expense },
            { label: 'Net worth', value: money(assets - debts) },
          ]} />
        </Card>
        {missing > 0 ? <Note warn>{missing} account(s) left out of totals: add an exchange rate in Settings.</Note> : null}
        {ACCOUNT_KINDS.map((kind) => {
          const items = rows.filter((r) => !r.account.archived && r.account.kind === kind);
          return items.length ? <Card key={kind} title={accountTitle(kind)}>{list(items)}</Card> : null;
        })}
        <Card><Row icon="people" title="Lend or borrow money" subtitle="Track what's owed and when it's due" onPress={() => router.push('/loan')} /></Card>
        {archived.length ? <Card title="Archived">{list(archived)}</Card> : null}
        {upcoming ? <Note>Balances are as of today. Transactions dated later are counted on their date.</Note> : null}
      </Screen>
    </>
  );
}
