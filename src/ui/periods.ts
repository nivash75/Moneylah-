import { useState } from 'react';
import { periodOf, shift, type Period, type PeriodUnit } from '../core/ledger';
import { useStore } from '../data/store';

export const dayMonth = (d: Date) => d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

/** For example "↑ $20.00", comparing an amount with an earlier one. */
export const changeText = (delta: number, money: (v: number) => string) => (delta === 0 ? 'no change' : `${delta > 0 ? '↑' : '↓'} ${money(Math.abs(delta))}`);

export const shortLabel = (p: Period) =>
  new Date(p.start).toLocaleDateString(undefined, p.unit === 'year' ? { year: 'numeric' } : p.unit === 'month' && p.cycleDay === 1 ? { month: 'short' } : { day: 'numeric', month: 'numeric' });

export function periodTitle(p: Period) {
  const start = new Date(p.start);
  const last = new Date(p.end - 1);
  if (p.unit === 'year') return String(start.getFullYear());
  if (p.unit === 'week') return `${dayMonth(start)} – ${dayMonth(last)}`;
  if (p.cycleDay === 1) return start.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const from = start.getFullYear() === last.getFullYear() ? dayMonth(start) : `${dayMonth(start)} ${start.getFullYear()}`;
  return `${from} – ${dayMonth(last)} ${last.getFullYear()}`;
}

/** The period being viewed, counted from the current one so it follows changes to the cycle day. */
export function usePeriod(unit: PeriodUnit) {
  const { cycleDay } = useStore().state.settings;
  const [offset, setOffset] = useState(0);
  const current = periodOf(unit, Date.now(), 1, cycleDay);
  return {
    isCurrent: offset === 0,
    period: offset ? shift(current, offset) : current,
    step: (direction: -1 | 1) => setOffset((n) => n + direction),
    reset: () => setOffset(0),
  };
}
