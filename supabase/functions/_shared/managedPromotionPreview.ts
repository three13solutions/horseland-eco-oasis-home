import { normalizePromoCode, validPromotionDate } from './epPromo.ts';
import type { EpPromotion } from './epPromo.ts';
import { QuoteError } from './bookingQuote.ts';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type PromotionLookup = {
  from(table: 'website_promotions'): {
    select(columns: '*'): {
      eq(column: 'code', value: string): {
        maybeSingle(): PromiseLike<{data: EpPromotion | null; error: unknown}>;
      };
    };
  };
};
/** Admin endpoint only. Read-only normalization of an unsaved promotion draft. */
export async function preparePromotionPreview(db: PromotionLookup, rawInput: unknown): Promise<EpPromotion> {
  const invalid = (message: string): never => { throw new QuoteError('INVALID_PROMOTION_DRAFT', message, 400); };
  if (!rawInput || typeof rawInput !== 'object' || Array.isArray(rawInput)) invalid('A promotion draft is required.');
  const input = rawInput as Record<string, unknown>;
  let code: string | undefined;
  try { code = normalizePromoCode(input.code); } catch { invalid('Invalid promotion code.'); }
  if (!code || typeof input.label !== 'string' || !input.label.trim()) invalid('Code and description are required.');
  if (typeof input.is_active !== 'boolean' || typeof input.is_public !== 'boolean') invalid('Choose visibility and activation explicitly.');
  const {data: existing, error} = await db.from('website_promotions').select('*').eq('code', code!).maybeSingle();
  if (error) throw new QuoteError('PREVIEW_LOOKUP_FAILED', 'Could not verify the promotion.', 503);
  if (existing && input.revision !== existing.revision) throw new QuoteError('PROMOTION_CHANGED', 'Reload this promotion before previewing.');
  if (!existing && input.revision != null) throw new QuoteError('PROMOTION_CHANGED', 'This promotion no longer exists.');
  const p: Record<string, unknown> = { ...input, code, revision: existing?.revision ?? 1, amount_per_night: 0, amount_per_booking: 0, is_active: true };
  if (existing?.discount_kind === 'legacy') {
    // Never let an unsaved preview redefine an existing legacy promotion's discount.
    Object.assign(p, {discount_kind:'legacy',discount_basis:existing.discount_basis,discount_value:existing.discount_value,amount_per_night:existing.amount_per_night,amount_per_booking:existing.amount_per_booking});
  } else {
    if (['EP300','DIRECT1000'].includes(code!)) invalid('This reserved promotion is unavailable.');
    if (!['fixed','percentage'].includes(p.discount_kind as string) || !['booking','night'].includes(p.discount_basis as string)) invalid('Choose a valid discount type and basis.');
    if (typeof p.discount_value !== 'number' || !Number.isFinite(p.discount_value) || p.discount_value <= 0 || p.discount_value > 99999999.99 || (p.discount_kind === 'percentage' && p.discount_value > 100) || Math.abs(p.discount_value*100-Math.round(p.discount_value*100))>1e-6) invalid('Enter a valid discount to two decimal places.');
  }
  for (const key of ['booking_from','booking_to','stay_from','stay_to']) {
    if (p[key] != null && !validPromotionDate(p[key])) invalid('Use valid ISO calendar dates.');
    p[key] ??= null;
  }
  if ((p.booking_from && p.booking_to && (p.booking_from as string) > (p.booking_to as string)) || (p.stay_from && p.stay_to && (p.stay_from as string) > (p.stay_to as string))) invalid('Date windows must be ordered.');
  if (!['both','weekday','weekend'].includes(p.day_scope as string)) invalid('Choose day eligibility.');
  if (p.mixed_stay_mode != null && !['all_nights','eligible_nights'].includes(p.mixed_stay_mode as string)) invalid('Choose a valid stay policy.');
  for (const key of ['eligible_room_category_ids','eligible_meal_plan_codes']) {
    if (p[key] == null) { p[key] = null; continue; }
    const values = p[key];
    if (!Array.isArray(values) || !values.length || values.some((value: unknown) => key === 'eligible_room_category_ids' ? typeof value !== 'string' || !uuid.test(value) : !['RO','BB','HB','FB'].includes(value as string))) invalid('Select eligible categories/plans or use unrestricted.');
    p[key] = [...new Set(values as string[])];
  }
  if (p.min_stay_nights != null && (typeof p.min_stay_nights !== 'number' || !Number.isInteger(p.min_stay_nights) || p.min_stay_nights<1 || p.min_stay_nights>365)) invalid('Minimum stay must be 1–365 whole nights.');
  p.excluded_stay_dates ??= [];
  if (!Array.isArray(p.excluded_stay_dates) || p.excluded_stay_dates.some((d: unknown) => !validPromotionDate(d))) invalid('Invalid excluded dates.');
  if ((p.day_scope !== 'both' || p.stay_from || p.stay_to || (p.excluded_stay_dates as string[]).length) && !p.mixed_stay_mode) invalid('Choose an explicit stay policy for restrictions.');
  if ((p.code==='DIRECT1000' || p.discount_basis==='booking') && p.mixed_stay_mode==='eligible_nights') invalid('Once-per-booking promotions require all nights to qualify.');
  for (const key of ['total_usage_limit','per_guest_usage_limit']) if (p[key] != null && (typeof p[key] !== 'number' || !Number.isSafeInteger(p[key]) || (p[key] as number)<1)) invalid('Usage limits must be positive whole numbers.');
  return p as unknown as EpPromotion;
}
