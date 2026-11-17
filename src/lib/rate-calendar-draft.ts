/** In-memory drafting only. No database writes or fallback to legacy AP anchors. */
import { PLAN_CODES, previewEpNight } from './ep-rate-preview.ts';
import type { ManualPlanOverride, MoneyByPlan, PlanCode } from './ep-rate-preview.ts';

export type DayFilter = 'all' | 'weekdays' | 'weekends';
export interface DraftRate {
  categoryId: string;
  date: string;
  epPaise: number;
  minimumEpPaise: number;
  mealTotalsPaise: Partial<MoneyByPlan>;
  overrides?: Partial<Record<Exclude<PlanCode, 'RO'>, ManualPlanOverride>>;
}
export interface DraftRateChange {
  categoryId: string;
  dates: string[];
  epPaise: number;
  minimumEpPaise?: number;
  mealTotalsPaise?: Partial<MoneyByPlan>;
  overrides?: DraftRate['overrides'];
}
const MAX_DATES = 732;
function dateNumber(value: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('Use a valid YYYY-MM-DD date.');
  const time = Date.parse(`${value}T00:00:00Z`);
  if (!Number.isFinite(time) || new Date(time).toISOString().slice(0, 10) !== value) throw new Error('Use a valid calendar date.');
  return time;
}
function money(value: number, label: string): number {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error(`${label} must be non-negative integer paise.`);
  return value;
}
export function parseRupeesToPaise(value: string): number {
  const cleaned = value.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) throw new Error('Enter a non-negative amount with at most two decimal places.');
  return money(Math.round(Number(cleaned) * 100), 'Amount');
}
/** Inclusive date range. Day boundaries are date-only, independent of browser timezone. */
export function selectDates(start: string, end: string, filter: DayFilter = 'all', weekendDays: number[] = [6]): string[] {
  const from = dateNumber(start), to = dateNumber(end);
  if (to < from) throw new Error('End date must be on or after start date.');
  if ((to - from) / 86400000 + 1 > MAX_DATES) throw new Error('Select no more than 732 dates at once.');
  if (!['all', 'weekdays', 'weekends'].includes(filter)) throw new Error('Unknown day filter.');
  if (weekendDays.some(d => !Number.isInteger(d) || d < 0 || d > 6)) throw new Error('Weekend days must be between 0 and 6.');
  const result: string[] = [];
  for (let time = from; time <= to; time += 86400000) {
    const date = new Date(time), weekend = weekendDays.includes(date.getUTCDay());
    if (filter === 'all' || (filter === 'weekdays' && !weekend) || (filter === 'weekends' && weekend)) result.push(date.toISOString().slice(0, 10));
  }
  return result;
}
export function getDraftRate(rates: readonly DraftRate[], categoryId: string, date: string): DraftRate | undefined {
  return rates.find(rate => rate.categoryId === categoryId && rate.date === date);
}
export function previewDraftRate(rate: DraftRate) {
  money(rate.epPaise, 'EP');
  money(rate.minimumEpPaise, 'Minimum EP');
  if (rate.epPaise < rate.minimumEpPaise) throw new Error('EP is below the configured minimum.');
  if (rate.mealTotalsPaise.RO !== undefined && rate.mealTotalsPaise.RO !== 0) throw new Error('EP cannot include meals.');
  for (const code of Object.keys(rate.overrides ?? {})) if (!['BB', 'HB', 'FB'].includes(code)) throw new Error('Only CP, MAP or AP may be overridden.');
  const missingPlans = PLAN_CODES.filter(code => code !== 'RO' && rate.mealTotalsPaise[code] == null);
  const warnings: string[] = missingPlans.length ? ['Meal supplements are not configured for every plan. Missing prices are not guessed.'] : [];
  const rows = PLAN_CODES.map(code => {
    const supplement = code === 'RO' ? 0 : rate.mealTotalsPaise[code];
    const automaticPaise = supplement == null ? null : money(rate.epPaise + money(supplement, `${code} meals`), `${code} total`);
    const override = code === 'RO' ? undefined : rate.overrides?.[code];
    if (override && (!override.reason?.trim() || !override.actorId?.trim())) throw new Error('Manual overrides require a reason and actor.');
    const amountPaise = override ? money(override.amountPaise, `${code} override`) : automaticPaise;
    if (amountPaise !== null && amountPaise < rate.minimumEpPaise) throw new Error(`${code} is below the configured minimum.`);
    return { code, amountPaise, automaticPaise, mode: override ? 'manual' as const : 'automatic' as const };
  });
  if (!missingPlans.length) {
    const complete = previewEpNight({ basis: 'EP', epPaise: rate.epPaise, minimumEpPaise: rate.minimumEpPaise, mealTotalsPaise: { ...rate.mealTotalsPaise, RO: 0 } as MoneyByPlan, overrides: rate.overrides });
    warnings.push(...complete.warnings);
  } else {
    const known = rows.filter(row => row.amountPaise !== null);
    if (known.some((row, i) => i > 0 && row.amountPaise! < known[i - 1].amountPaise!)) warnings.push('Meal-plan prices are out of EP / CP / MAP / AP order. Review before saving.');
    if (rows.some(row => row.mode === 'manual')) warnings.push('Manual prices stay fixed when the EP base changes. Reset to automatic to resume linked pricing.');
  }
  return { rows, warnings, missingPlans };
}
/** Atomic immutable update: validate all inputs before returning a replacement array. */
export function applyDraftRates(existing: readonly DraftRate[], change: DraftRateChange): DraftRate[] {
  if (!change.categoryId.trim()) throw new Error('Choose a room category.');
  if (!change.dates.length || change.dates.length > MAX_DATES) throw new Error('Select between 1 and 732 dates.');
  const dates = [...new Set(change.dates)].sort();
  dates.forEach(dateNumber);
  const replacements = dates.map(date => {
    const previous = getDraftRate(existing, change.categoryId, date);
    const rate: DraftRate = {
      categoryId: change.categoryId, date, epPaise: change.epPaise,
      minimumEpPaise: change.minimumEpPaise ?? previous?.minimumEpPaise ?? 0,
      mealTotalsPaise: { ...(change.mealTotalsPaise ?? previous?.mealTotalsPaise ?? {}), RO: 0 },
      overrides: change.overrides === undefined ? structuredClone(previous?.overrides) : structuredClone(change.overrides),
    };
    if (change.mealTotalsPaise?.RO !== undefined && change.mealTotalsPaise.RO !== 0) throw new Error('EP cannot include meals.');
    previewDraftRate(rate);
    return rate;
  });
  const selected = new Set(dates);
  return [...existing.filter(rate => rate.categoryId !== change.categoryId || !selected.has(rate.date)).map(rate => structuredClone(rate)), ...replacements]
    .sort((a, b) => a.date.localeCompare(b.date) || a.categoryId.localeCompare(b.categoryId));
}
