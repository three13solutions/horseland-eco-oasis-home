/** Server-only policy: one selectable offer per single-room checkout.
 * Discounts accommodation only, once per occupied night, never per guest.
 * Meals/extras and cancellation-policy adjustment are not discounted.
 */
export type EpPromotion = { code: string; revision: number; amount_per_night: number; amount_per_booking?: number; is_active: boolean; label?: string; discount_kind?: string; discount_value?: number; discount_basis?: string; booking_from?: string | null; booking_to?: string | null; stay_from?: string | null; stay_to?: string | null; day_scope?: string; mixed_stay_mode?: string | null; is_public?: boolean };
export function normalizePromoCode(value: unknown): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string' || !/^[A-Z0-9_-]{3,30}$/.test(value.trim().toUpperCase())) throw new Error('Invalid promotion code.');
  return value.trim().toUpperCase();
}
const cents = (value: unknown) => {
  if (!['string','number'].includes(typeof value) || value === '') throw new Error('Invalid promotion price basis.');
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || !Number.isSafeInteger(Math.round(n * 100))) throw new Error('Invalid promotion price basis.');
  return Math.round(n * 100);
};
export function calculateEpPromotion(variant: Record<string, unknown>, checkIn: string, checkOut: string, promotion: EpPromotion, context: { now?: Date; eligibleDates?: string[] } = {}) {
  const eligibleDates = eligiblePromotionDates(checkIn, checkOut, promotion, context);
  if (promotion.discount_kind && promotion.discount_kind !== 'legacy') return calculateManagedPromotion(variant, checkIn, checkOut, promotion, eligibleDates);
  if (promotion.code === 'DIRECT1000') {
    if (!promotion.is_active || !Number.isSafeInteger(promotion.revision) || promotion.revision < 1 || Number(promotion.amount_per_booking) !== 1000 || Number(promotion.amount_per_night) !== 0) throw new Error('This promotion is unavailable.');
    const nights = (Date.parse(checkOut) - Date.parse(checkIn)) / 86400000;
    if (!Number.isInteger(nights) || nights < 1 || nights > 365) throw new Error('Invalid stay dates.');
    const discount = Math.min(100000, cents(variant.room_rate), cents(variant.total_price));
    if (!discount) throw new Error('This offer cannot be applied to the current room price.');
    return { code: promotion.code, revision: promotion.revision, basis: 'FLAT_PER_BOOKING', amount_per_night: 0,
      amount_per_booking: 1000, nights, discount_amount: discount / 100, nightly_discounts: [] };
  }
  if (!promotion.is_active || !Number.isSafeInteger(promotion.revision) || promotion.revision < 1 || promotion.amount_per_night !== 300 || promotion.code !== 'EP300') throw new Error('This promotion is unavailable.');
  const count = (Date.parse(checkOut) - Date.parse(checkIn)) / 86400000;
  const rows = variant.nightly_breakdown;
  if (!Number.isInteger(count) || count < 1 || count > 365 || !Array.isArray(rows) || rows.length !== count || variant.pricing_status !== 'verified') throw new Error('This offer requires a verified room-only price for every stay night.');
  const breakdown = rows.map((row, index) => {
    const date = new Date(Date.parse(checkIn) + index * 86400000).toISOString().slice(0, 10);
    if (!row || row.date !== date || row.promo_eligible_ep === false) throw new Error('The nightly price breakdown has changed.');
    // room_only deliberately excludes extra-accommodation, meal and addon charges.
    return { date, room_only: cents(row.room_only) / 100, discount: eligibleDates.includes(date) ? Math.min(cents(row.room_only), 30000) / 100 : 0 };
  });
  const discount = breakdown.reduce((sum, row) => sum + cents(row.discount), 0);
  // Do not use a promotion to offset a negative policy total / consume meals.
  if (!discount || discount > cents(variant.room_rate) || discount > cents(variant.total_price)) throw new Error('This offer cannot be applied to the current room price.');
  return { code: promotion.code, revision: promotion.revision, basis: 'EP_PER_ROOM_PER_NIGHT', amount_per_night: 300,
    nights: count, discount_amount: discount / 100, nightly_discounts: breakdown };
}

export function promotionBookingOpen(p: EpPromotion, now = new Date()) {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  return p.is_active && (!p.booking_from || today >= p.booking_from) && (!p.booking_to || today <= p.booking_to);
}
export function eligiblePromotionDates(checkIn: string, checkOut: string, p: EpPromotion, context: {now?: Date; eligibleDates?: string[]} = {}) {
  if (!promotionBookingOpen(p, context.now)) throw new Error('This promotion is inactive or outside its booking window.');
  const count = (Date.parse(checkOut) - Date.parse(checkIn)) / 86400000;
  if (!Number.isInteger(count) || count < 1 || count > 365) throw new Error('Invalid stay dates.');
  const all = Array.from({length: count}, (_, i) => new Date(Date.parse(checkIn) + i * 86400000).toISOString().slice(0,10));
  const restricted = (p.day_scope && p.day_scope !== 'both') || p.stay_from || p.stay_to;
  if (restricted && !['all_nights','eligible_nights'].includes(p.mixed_stay_mode ?? '')) throw new Error('This promotion requires an explicit mixed-stay policy.');
  if (p.day_scope && p.day_scope !== 'both' && !context.eligibleDates) throw new Error('Promotion day eligibility could not be verified.');
  const eligible = all.filter(d => (!p.stay_from || d >= p.stay_from) && (!p.stay_to || d <= p.stay_to) && (!p.day_scope || p.day_scope === 'both' || context.eligibleDates!.includes(d)));
  if (!eligible.length || (p.mixed_stay_mode === 'all_nights' && eligible.length !== all.length)) throw new Error('This stay is not eligible for this promotion.');
  // A once-per-booking discount must never be silently prorated over mixed nights.
  const flat = p.code === 'DIRECT1000' || p.discount_basis === 'booking';
  if (flat && eligible.length !== all.length) throw new Error('This once-per-booking offer requires every stay night to qualify.');
  return eligible;
}
function calculateManagedPromotion(v: Record<string, unknown>, checkIn: string, checkOut: string, p: EpPromotion, eligible: string[]) {
  if (!Number.isSafeInteger(p.revision) || p.revision < 1 || !['fixed','percentage'].includes(p.discount_kind ?? '') || !['booking','night'].includes(p.discount_basis ?? '')) throw new Error('Invalid promotion configuration.');
  const value = Number(p.discount_value);
  if (!Number.isFinite(value) || value <= 0 || (p.discount_kind === 'percentage' && value > 100)) throw new Error('Invalid promotion value.');
  const nights = (Date.parse(checkOut) - Date.parse(checkIn)) / 86400000;
  let discount: number;
  const nightly: {date:string;room_only:number;discount:number}[] = [];
  if (p.discount_basis === 'night') {
    const rows = v.nightly_breakdown;
    if (v.pricing_status !== 'verified' || !Array.isArray(rows) || rows.length !== nights) throw new Error('This offer requires verified nightly accommodation prices.');
    for (let i = 0; i < nights; i++) {
      const date = new Date(Date.parse(checkIn) + i * 86400000).toISOString().slice(0,10), row = rows[i];
      if (!row || row.date !== date || row.promo_eligible_ep === false) throw new Error('Nightly accommodation is not eligible.');
      const basis = cents(row.room_only);
      nightly.push({date, room_only: basis/100, discount: eligible.includes(date) ? Math.min(basis, p.discount_kind === 'fixed' ? cents(value) : Math.round(basis * value / 100))/100 : 0});
    }
    discount = nightly.reduce((sum,r) => sum+cents(r.discount),0);
  } else {
    const basis = cents(v.room_rate);
    discount = Math.min(basis, p.discount_kind === 'fixed' ? cents(value) : Math.round(basis * value/100));
  }
  discount = Math.min(discount, cents(v.room_rate), cents(v.total_price));
  if (!discount) throw new Error('This offer cannot be applied to the current room price.');
  return {code:p.code, revision:p.revision, basis:p.discount_basis === 'night' ? 'ACCOMMODATION_PER_NIGHT' : 'FLAT_PER_BOOKING', amount_per_night:p.discount_basis === 'night' && p.discount_kind === 'fixed' ? value : 0, amount_per_booking:p.discount_basis === 'booking' && p.discount_kind === 'fixed' ? value : 0, nights, discount_amount:discount/100, nightly_discounts:nightly};
}
