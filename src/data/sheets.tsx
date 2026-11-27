import { useEffect, useState, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import { isScriptUrl, sheetsData } from '../core/googleSheets';
import type { State } from '../core/types';
import { crc32 } from '../core/zip';
import { loadLocal, saveLocal } from './db';
import { useStore } from './store';

export interface SheetsConfig {
  url: string;
  secret: string;
  /** When the last successful backup finished, or 0. */
  lastAt: number;
  /** Checksum of what was last saved, so unchanged records aren't sent again. */
  checksum: number;
  error: string;
}

const EMPTY: SheetsConfig = { url: '', secret: '', lastAt: 0, checksum: 0, error: '' };
const TIMEOUT = 30_000;
/** Waits for a burst of edits to finish. Short, because iOS soon suspends an app that is left. */
const DELAY = 3_000;

let config: SheetsConfig = { ...EMPTY, ...loadLocal<SheetsConfig>('sheets') };
const listeners = new Set<() => void>();

export function setSheetsConfig(change: Partial<SheetsConfig>) {
  config = { ...config, ...change };
  saveLocal('sheets', config);
  listeners.forEach((listener) => listener());
}

export const useSheetsConfig = () =>
  useSyncExternalStore((listener) => { listeners.add(listener); return () => listeners.delete(listener); }, () => config);

export function sheetsStatus({ url, lastAt, error }: SheetsConfig) {
  if (!url) return 'Not set up';
  if (error) return 'Last attempt failed';
  return lastAt ? `Backed up ${new Date(lastAt).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}` : 'Not backed up yet';
}

async function send(state: State, force: boolean) {
  const { url, secret, checksum } = config;
  if (!isScriptUrl(url)) return;
  // An empty app must not wipe an earlier backup on its own.
  if (!force && state.txns.length === 0) return;
  const sheets = sheetsData(state);
  const next = crc32(new TextEncoder().encode(JSON.stringify(sheets)));
  if (!force && next === checksum) return;
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), TIMEOUT);
  let error = '';
  try {
    const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ secret, sheets }), signal: abort.signal });
    // A sign-in page instead of JSON means the web app isn't open to this app.
    const reply = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
    if (!reply) error = 'Google did not accept the request. Check that access to the web app is set to Anyone.';
    else if (!reply.ok) error = String(reply.error ?? 'The script reported a problem.');
  } catch {
    error = 'Could not reach Google. Check your internet connection.';
  } finally {
    clearTimeout(timer);
  }
  // The connection may have been changed or removed while waiting.
  if (config.url !== url) return;
  setSheetsConfig(error ? { error } : { error: '', lastAt: Date.now(), checksum: next });
}

/** One upload at a time, in order, so older records never overwrite newer ones. */
let queue: Promise<void> = Promise.resolve();
export function backUpToSheets(state: State, force = false) {
  queue = queue.then(() => send(state, force)).catch((error: unknown) => console.log('Sheets backup failed', error));
  return queue;
}

/** Backs up shortly after records change, and when the app comes forward. */
export function SheetsSync() {
  const { state } = useStore();
  const { url } = useSheetsConfig();
  const [activations, setActivations] = useState(0);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') setActivations((n) => n + 1); });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!url) return;
    const timer = setTimeout(() => void backUpToSheets(state), DELAY);
    return () => clearTimeout(timer);
  }, [state, url, activations]);

  return null;
}
