import { ageBandLabel, guestTypeName, type GuestAgeBand } from './guest-age-policy.ts';
import type { LiveMeal, LivePlan } from './meal-pricing-contract';

export type MealGuestPriceSnapshot = {
  revision: number;
  guest_policy_revision: number;
  prices: Record<string, Record<string, number>>;
};

const guestKey = /^[a-z][a-z0-9_]{0,99}$/;
const mealId = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

/** Undefined means missing; zero is an intentional price. No fractional paise. */
export function mealGuestPricePaise(value: unknown): number | undefined {
  if (typeof value !== 'number' && typeof value !== 'string') return undefined;
  const match = /^(\d{1,8})(?:\.(\d{1,2}))?$/.exec(String(value).trim());
  if (!match) return undefined;
  return Number(match[1]) * 100 + Number((match[2] ?? '').padEnd(2, '0'));
}

export function parseMealGuestPriceSnapshot(value: unknown): MealGuestPriceSnapshot {
  const invalid = () => new Error('Guest-type pricing response could not be verified. Reload before reviewing prices.');
  if (!record(value)) throw invalid();
  const revision = Number(value.revision);
  const ageRevision = Number(value.guest_policy_revision);
  const validRevision = (raw: unknown, parsed: number) => (typeof raw === 'number' || typeof raw === 'string')
    && /^\d+$/.test(String(raw)) && Number.isSafeInteger(parsed) && parsed >= 0;
  if (!validRevision(value.revision, revision) || !validRevision(value.guest_policy_revision, ageRevision) || !record(value.prices)) throw invalid();
  const prices = Object.fromEntries(Object.entries(value.prices).map(([id, row]) => {
    if (!mealId.test(id) || !record(row)) throw invalid();
    return [id, Object.fromEntries(Object.entries(row).map(([key, raw]) => {
      const paise = mealGuestPricePaise(raw);
      if (!guestKey.test(key) || key === 'adult' || paise === undefined) throw invalid();
      return [key, paise / 100];
    }))];
  }));
  return { revision, guest_policy_revision: ageRevision, prices };
}

export function catalogueMealBands(bands: GuestAgeBand[] = []) {
  return bands.filter(band => band.enabled !== false).sort((a, b) =>
    a.key === 'adult' ? (b.key === 'adult' ? 0 : -1) : b.key === 'adult' ? 1 : b.min_age - a.min_age);
}

export function catalogueMealBandName(band: GuestAgeBand) {
  if (band.key === 'infant' && band.min_age === 0 && band.max_age === 3 && (!band.name || /^(infant(s)?|young children)$/i.test(band.name))) return 'Under 4';
  return guestTypeName(band);
}
export function catalogueMealBandLabel(band: GuestAgeBand) {
  return `${catalogueMealBandName(band)} (${ageBandLabel(band)})`;
}

export const currencyForMealGuestPrice = (paise: number) => (paise / 100).toLocaleString('en-IN', {
  style: 'currency', currency: 'INR', minimumFractionDigits: paise % 100 ? 2 : 0,
});

export function catalogueMealPriceForGuest(
  meal: { id: string; price: number }, band: GuestAgeBand, snapshot?: MealGuestPriceSnapshot,
): number | undefined {
  if (band.meal_rule === 'free') return 0;
  if (band.key === 'adult') return mealGuestPricePaise(meal.price);
  const row = snapshot?.prices[meal.id];
  return row && Object.prototype.hasOwnProperty.call(row, band.key) ? mealGuestPricePaise(row[band.key]) : undefined;
}

export type GuestMealRollup = { kind: 'fixed'; paise: number }
  | { kind: 'range'; minPaise: number; maxPaise: number }
  | { kind: 'unavailable'; reason: 'missing_price' | 'missing_groups' | 'unavailable_meal' };

/** One price per AND group; alternatives in the same group are OR, never summed. */
export function rollUpCatalogueGuestMealPrices(
  plan: Pick<LivePlan, 'plan_code' | 'groups'>, meals: ReadonlyMap<string, LiveMeal>, band: GuestAgeBand,
  snapshot?: MealGuestPriceSnapshot,
): GuestMealRollup {
  if (plan.plan_code === 'RO') return { kind: 'fixed', paise: 0 };
  if (!plan.groups.length) return { kind: 'unavailable', reason: 'missing_groups' };
  if (band.meal_rule === 'free') return { kind: 'fixed', paise: 0 };
  let minPaise = 0;
  let maxPaise = 0;
  for (const group of plan.groups) {
    if (!group.meal_ids.length) return { kind: 'unavailable', reason: 'missing_groups' };
    const amounts: number[] = [];
    for (const id of group.meal_ids) {
      const meal = meals.get(id);
      if (!meal?.is_active) return { kind: 'unavailable', reason: 'unavailable_meal' };
      const amount = catalogueMealPriceForGuest(meal, band, snapshot);
      if (amount === undefined) return { kind: 'unavailable', reason: 'missing_price' };
      amounts.push(amount);
    }
    minPaise += Math.min(...amounts);
    maxPaise += Math.max(...amounts);
  }
  return minPaise === maxPaise ? { kind: 'fixed', paise: minPaise } : { kind: 'range', minPaise, maxPaise };
}

export function buildCatalogueMealGuestPriceRow(bands: GuestAgeBand[], values: Record<string, string>) {
  const prices: Record<string, number> = {};
  for (const band of catalogueMealBands(bands)) {
    if (band.key === 'adult' || band.meal_rule === 'free') continue;
    const raw = Object.prototype.hasOwnProperty.call(values, band.key) ? values[band.key].trim() : '';
    if (!raw) continue;
    const paise = mealGuestPricePaise(raw);
    if (paise === undefined) throw new Error(`Enter a price from ₹0 to ₹99,999,999.99 for ${catalogueMealBandName(band)}, with at most two decimal places.`);
    prices[band.key] = paise / 100;
  }
  return prices;
}
