import { ACCOUNT_KINDS, TXN_KINDS, type State } from './types.ts';
import { MAX_MINOR, isCurrencyCode } from './money.ts';

const VERSION = 1;

/** `app` and the database name keep the first working name, so existing data and backups still open. */
export const toBackup = (state: State) => JSON.stringify({ app: 'pocket-ledger', version: VERSION, state });

type Check = (value: unknown) => boolean;
const str: Check = (v) => typeof v === 'string';
const id: Check = (v) => typeof v === 'string' && v.length > 0;
const bool: Check = (v) => typeof v === 'boolean';
const amount: Check = (v) => Number.isInteger(v) && Math.abs(v as number) <= MAX_MINOR;
const int: Check = (v) => Number.isSafeInteger(v);
const nullableId: Check = (v) => v === null || id(v);
const oneOf = (...options: string[]): Check => (v) => options.includes(v as string);
/** Fields added later, which older records don't have. */
const optional = new Set(['loan', 'dueDate']);

const SCHEMA: Record<'accounts' | 'categories' | 'txns' | 'budgets' | 'rates', Record<string, Check>> = {
  accounts: { id, name: str, kind: oneOf(...ACCOUNT_KINDS), currency: isCurrencyCode, opening: amount, includeInTotal: bool, archived: bool, statementDay: int, paymentDay: int, creditLimit: amount },
  categories: { id, name: str, icon: str, kind: oneOf('expense', 'income'), parentId: nullableId, order: int },
  txns: { id, kind: oneOf(...TXN_KINDS), date: int, amount, toAmount: amount, baseAmount: amount, baseCurrency: isCurrencyCode, note: str, accountId: id, toAccountId: nullableId, categoryId: nullableId, loan: oneOf('lend', 'borrow', 'repayment'), dueDate: int },
  budgets: { id, amount, currency: isCurrencyCode, categoryId: nullableId },
  rates: { id: isCurrencyCode, base: isCurrencyCode, rate: (v) => typeof v === 'number' && Number.isFinite(v) && v > 0 },
};

const fail = (why: string): never => { throw new Error(`The backup file is damaged: ${why}.`); };
const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Parses and fully validates a backup, so nothing is replaced by a file that can't be used. */
export function fromBackup(text: string): State {
  let file: unknown;
  try { file = JSON.parse(text); } catch { fail('it is not valid JSON'); }
  if (!isObject(file) || file.app !== 'pocket-ledger') throw new Error('This is not a Moneylah! backup.');
  if (file.version !== VERSION) throw new Error('This backup was made by an unsupported app version.');
  const raw = isObject(file.state) ? file.state : fail('no data');

  // Copy only known fields.
  const out: Record<string, unknown> = {};
  for (const [name, fields] of Object.entries(SCHEMA)) {
    const list = raw[name];
    if (!Array.isArray(list)) fail(`${name} is missing`);
    const seen = new Set<unknown>();
    out[name] = (list as unknown[]).map((item) => {
      if (!isObject(item)) return fail(`bad entry in ${name}`);
      const clean: Record<string, unknown> = {};
      for (const [key, check] of Object.entries(fields)) {
        if (item[key] === undefined && optional.has(key)) continue;
        if (!check(item[key])) fail(`bad ${key} in ${name}`);
        clean[key] = item[key];
      }
      if (seen.has(clean.id)) fail(`duplicate entry in ${name}`);
      seen.add(clean.id);
      return clean;
    });
  }
  const s = raw.settings;
  if (!isObject(s) || !isCurrencyCode(s.baseCurrency) || !bool(s.lockEnabled) || !bool(s.hideWidgetAmounts)) fail('bad settings');
  const settings = s as Record<string, unknown>;
  // Backups made before cycle days existed used calendar months.
  const cycleDay = settings.cycleDay ?? 1;
  if (!int(cycleDay) || (cycleDay as number) < 1 || (cycleDay as number) > 31) fail('bad settings');
  const autoRates = settings.autoRates ?? true;
  const categorySet = settings.categorySet ?? 0;
  if (!bool(autoRates) || !int(categorySet)) fail('bad settings');
  out.settings = { baseCurrency: settings.baseCurrency, lockEnabled: settings.lockEnabled, hideWidgetAmounts: settings.hideWidgetAmounts, cycleDay,
    autoRates, categorySet,
    // These belong to the device, not to the records.
    ratesUpdated: 0, lastBackup: 0 };
  const state = out as unknown as State;

  const accounts = new Set(state.accounts.map((a) => a.id));
  const categories = new Map(state.categories.map((c) => [c.id, c]));
  for (const c of state.categories) {
    const seen = new Set([c.id]);
    for (let next = c.parentId; next; next = categories.get(next)!.parentId) {
      if (!categories.has(next) || seen.has(next)) fail('bad category tree');
      seen.add(next);
    }
  }
  for (const t of state.txns) {
    if (!accounts.has(t.accountId) || (t.toAccountId && !accounts.has(t.toAccountId)) || (t.categoryId && !categories.has(t.categoryId))) fail('a transaction refers to something missing');
  }
  if (state.budgets.some((b) => b.categoryId && !categories.has(b.categoryId))) fail('a budget refers to a missing category');
  return state;
}
