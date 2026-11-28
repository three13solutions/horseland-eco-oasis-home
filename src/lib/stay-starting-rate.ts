// Discovery only: all prices and eligibility come from the website variant engine.
export const STARTING_RATE_DAYS = 30;
export const STARTING_RATE_GUESTS = { adult: 2, child: 0, infant: 0 };

export interface StartingVariant {
  price_per_night: number;
  total_price: number;
  pricing_status?: string;
  quote_fingerprint?: string;
  meal_plan_code: string;
  cancellation_policy_code: string;
  meal_plan_name?: string;
}
export interface StartingRate {
  checkIn: string;
  checkOut: string;
  variant: StartingVariant;
}

export function hotelToday(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(now);
}

export function startingRateDates(today: string, days = STARTING_RATE_DAYS) {
  const date = new Date(`${today}T00:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== today || !Number.isInteger(days) || days < 1 || days > 366) {
    throw new Error('Invalid starting-rate window');
  }
  return Array.from({ length: days }, (_, index) => ({
    checkIn: new Date(date.getTime() + index * 86400000).toISOString().slice(0, 10),
    checkOut: new Date(date.getTime() + (index + 1) * 86400000).toISOString().slice(0, 10),
  }));
}

// These are the statuses accepted by calculateBookingQuote; no preview-only rates.
export function isBookableStartingVariant(variant: StartingVariant): boolean {
  return ['verified', 'mixed_basis_unverified', 'legacy_basis_unverified'].includes(variant.pricing_status ?? '')
    && typeof variant.quote_fingerprint === 'string' && variant.quote_fingerprint.length > 0
    && ['RO', 'BB', 'HB', 'FB'].includes(variant.meal_plan_code)
    && typeof variant.cancellation_policy_code === 'string' && variant.cancellation_policy_code.length > 0
    && typeof variant.price_per_night === 'number' && Number.isFinite(variant.price_per_night) && variant.price_per_night >= 0
    && typeof variant.total_price === 'number' && Number.isFinite(variant.total_price) && variant.total_price >= 0
    && variant.price_per_night === variant.total_price;
}

export async function findStartingRate(
  today: string,
  fetchVariants: (checkIn: string, checkOut: string) => Promise<StartingVariant[]>,
  days = STARTING_RATE_DAYS,
): Promise<StartingRate | null> {
  const dates = startingRateDates(today, days);
  const offers: StartingRate[] = [];
  let next = 0;
  // Bounded concurrent read-only requests; a failed date fails the whole scan,
  // rather than claiming a minimum from incomplete or stale results.
  await Promise.all(Array.from({ length: Math.min(4, dates.length) }, async () => {
    while (next < dates.length) {
      const range = dates[next++];
      const variants = await fetchVariants(range.checkIn, range.checkOut);
      if (!Array.isArray(variants)) throw new Error('Starting rates could not be verified');
      for (const variant of variants) {
        if (isBookableStartingVariant(variant)) offers.push({ ...range, variant });
      }
    }
  }));
  offers.sort((a, b) => a.variant.price_per_night - b.variant.price_per_night || a.checkIn.localeCompare(b.checkIn));
  return offers[0] ?? null;
}