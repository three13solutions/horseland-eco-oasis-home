/** Isolated server-oriented groundwork, NOT wired to checkout or a public endpoint.
 * The resolver must load approved records from trusted storage, never request prices.
 * Output is a room/meal subtotal, not a payable quote: no taxes, extras or promos.
 */
import { PLAN_CODES, previewEpNight } from './ep-rate-preview.ts';
import type { EpNightInput, PlanCode } from './ep-rate-preview.ts';

export interface StaySelection {
  categoryId: string;
  checkIn: string;
  checkOut: string;
  plan: PlanCode;
  guests: { adults: number; children: number; infants: number };
}
export interface NightContext {
  categoryId: string;
  date: string;
  guests: StaySelection['guests'];
}
/** Revision/approval metadata must be established by the trusted resolver. */
export interface ApprovedNight extends NightContext {
  approval: 'approved';
  rateRevision: string;
  policyRevision: string;
  pricing: EpNightInput;
}
export type ApprovedNightResolver = (context: Readonly<NightContext>) => ApprovedNight | undefined;
function dateValue(value: string): number {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('Invalid stay date.');
  const parsed = Date.parse(`${value}T00:00:00Z`);
  if (!Number.isFinite(parsed) || new Date(parsed).toISOString().slice(0, 10) !== value) throw new Error('Invalid stay date.');
  return parsed;
}
function identifier(value: string, name: string) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${name} is required.`);
}
/** One room only. Occupancy pricing must already be fully resolved for each date.
 * No default occupancy, weekend rule, meal policy or fallback date is assumed.
 */
export function quoteEpStay(selection: StaySelection, resolve: ApprovedNightResolver) {
  const request = structuredClone(selection);
  identifier(request.categoryId, 'Category');
  if (!PLAN_CODES.includes(request.plan)) throw new Error('Unknown meal plan.');
  for (const key of ['adults', 'children', 'infants'] as const) {
    const count = request.guests?.[key];
    if (!Number.isSafeInteger(count) || count < (key === 'adults' ? 1 : 0) || count > 100) throw new Error('Invalid guest counts.');
  }
  const start = dateValue(request.checkIn), end = dateValue(request.checkOut);
  const count = (end - start) / 86400000;
  if (count < 1 || count > 365) throw new Error('Stay must contain between 1 and 365 nights.');
  const nights = [];
  let subtotalPaise = 0;
  for (let time = start; time < end; time += 86400000) {
    const date = new Date(time).toISOString().slice(0, 10);
    const context = Object.freeze({ categoryId: request.categoryId, date, guests: Object.freeze({ ...request.guests }) });
    const loaded = resolve(context);
    if (!loaded) throw new Error(`Approved rate and policy unavailable for ${date}.`);
    const record = structuredClone(loaded);
    if (record.approval !== 'approved') throw new Error(`Unapproved rate or policy for ${date}.`);
    identifier(record.rateRevision, 'Rate revision');
    identifier(record.policyRevision, 'Policy revision');
    if (record.categoryId !== request.categoryId || record.date !== date || !record.guests ||
        (['adults', 'children', 'infants'] as const).some(key => record.guests[key] !== request.guests[key])) {
      throw new Error(`Resolved pricing does not match selected category, date or occupancy for ${date}.`);
    }
    const preview = previewEpNight(record.pricing);
    const row = preview.rows.find(item => item.code === request.plan)!;
    subtotalPaise += row.amountPaise;
    if (!Number.isSafeInteger(subtotalPaise)) throw new Error('Stay subtotal exceeds safe integer range.');
    nights.push({ date, amountPaise: row.amountPaise, automaticPaise: row.automaticPaise,
      mode: row.mode, rateRevision: record.rateRevision, policyRevision: record.policyRevision,
      pricingSnapshot: record.pricing, warnings: preview.warnings });
  }
  return { version: 1 as const, basis: 'EP' as const, currency: 'INR' as const,
    kind: 'room-meal-subtotal' as const, selection: request, nights, subtotalPaise };
}
