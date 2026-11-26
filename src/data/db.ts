import { openDatabaseSync } from 'expo-sqlite';
import type { State } from '../core/types';

const COLLECTIONS = ['accounts', 'categories', 'txns', 'budgets', 'rates'] as const;

const db = openDatabaseSync('pocket-ledger.db');
db.execSync('CREATE TABLE IF NOT EXISTS records (kind TEXT NOT NULL, id TEXT NOT NULL, json TEXT NOT NULL, PRIMARY KEY (kind, id));');

/** null when nothing has been saved yet. */
export function loadState(): State | null {
  const rows = db.getAllSync<{ kind: string; json: string }>('SELECT kind, json FROM records ORDER BY rowid');
  if (rows.length === 0) return null;
  const out: Record<string, unknown> = { accounts: [], categories: [], txns: [], budgets: [], rates: [] };
  for (const row of rows) {
    // Defaults cover settings saved by earlier versions.
    if (row.kind === 'settings') out.settings = { cycleDay: 1, categorySet: 0, autoRates: true, ratesUpdated: 0, lastBackup: 0, ...JSON.parse(row.json) };
    else (out[row.kind] as unknown[]).push(JSON.parse(row.json));
  }
  if (!out.settings) throw new Error('The database has no settings record.');
  return out as unknown as State;
}

/** Writes only what changed, atomically. Unchanged records keep the same object reference. */
export function saveState(previous: State | null, next: State): void {
  const put = (kind: string, id: string, value: unknown) =>
    db.runSync(
      'INSERT INTO records (kind, id, json) VALUES (?, ?, ?) ON CONFLICT (kind, id) DO UPDATE SET json = excluded.json',
      kind, id, JSON.stringify(value),
    );
  db.withTransactionSync(() => {
    for (const kind of COLLECTIONS) {
      const before = new Map<string, unknown>((previous?.[kind] ?? []).map((item) => [item.id, item]));
      for (const item of next[kind]) {
        if (before.get(item.id) !== item) put(kind, item.id, item);
        before.delete(item.id);
      }
      for (const id of before.keys()) db.runSync('DELETE FROM records WHERE kind = ? AND id = ?', kind, id);
    }
    if (previous?.settings !== next.settings) put('settings', 'settings', next.settings);
  });
}
