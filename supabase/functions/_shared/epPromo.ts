/** Server-only policy: one selectable offer per single-room checkout.
 * Discounts accommodation only, once per occupied night, never per guest.
 * Meals/extras and cancellation-policy adjustment are not discounted.
 */
export type EpPromotion = { code: string; revision: number; amount_per_night: number; is_active: boolean };
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
export function calculateEpPromotion(variant: Record<string, unknown>, checkIn: string, checkOut: string, promotion: EpPromotion) {
  if (!promotion.is_active || !Number.isSafeInteger(promotion.revision) || promotion.revision < 1 || promotion.amount_per_night !== 300 || promotion.code !== 'EP300') throw new Error('This promotion is unavailable.');
  const count = (Date.parse(checkOut) - Date.parse(checkIn)) / 86400000;
  const rows = variant.nightly_breakdown;
  if (!Number.isInteger(count) || count < 1 || count > 365 || !Array.isArray(rows) || rows.length !== count || variant.pricing_status !== 'verified') throw new Error('This offer requires a verified room-only price for every stay night.');
  const breakdown = rows.map((row, index) => {
    const date = new Date(Date.parse(checkIn) + index * 86400000).toISOString().slice(0, 10);
    if (!row || row.date !== date || row.promo_eligible_ep === false) throw new Error('The nightly price breakdown has changed.');
    // room_only deliberately excludes extra-accommodation, meal and addon charges.
    return { date, room_only: cents(row.room_only) / 100, discount: Math.min(cents(row.room_only), 30000) / 100 };
  });
  const discount = breakdown.reduce((sum, row) => sum + cents(row.discount), 0);
  // Do not use a promotion to offset a negative policy total / consume meals.
  if (!discount || discount > cents(variant.room_rate) || discount > cents(variant.total_price)) throw new Error('This offer cannot be applied to the current room price.');
  return { code: promotion.code, revision: promotion.revision, basis: 'EP_PER_ROOM_PER_NIGHT', amount_per_night: 300,
    nights: count, discount_amount: discount / 100, nightly_discounts: breakdown };
}
