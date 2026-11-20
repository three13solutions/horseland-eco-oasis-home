export interface NightlyRateDetail {
  date: string;
  normalized_anchor?: number;
  room_only?: number;
  source_override_id?: string | null;
  anchor_id?: string;
  anchor_name?: string;
  dynamic_rules?: Record<string, unknown>[];
  length_of_stay_discount?: number;
}

/** Display only the policies the authoritative quote says were actually used. */
export function appliedOverrideIds(nights: NightlyRateDetail[]) {
  return [...new Set(nights.flatMap(night => [
    ...(night.source_override_id ? [night.source_override_id] : []),
    ...(night.dynamic_rules ?? []).flatMap(rule => {
      const id = rule.override_id ?? rule.id;
      return String(rule.type ?? '').includes('override') && typeof id === 'string' ? [id] : [];
    }),
  ]))];
}

export function stayDateRange(checkIn: Date, nights: number) {
  const checkOut = new Date(checkIn);
  checkOut.setDate(checkOut.getDate() + nights);
  return { checkIn, checkOut };
}

interface PromoQuote {
  promotion?: { code?: string; discount_amount?: number };
  original_variant?: { quote_fingerprint?: string };
  variant?: { total_price?: number; price_per_night?: number };
}

export function promoMatchesLiveRate(quote: PromoQuote | null | undefined, code: string, fingerprint: string | undefined) {
  return !!fingerprint && quote?.promotion?.code === code &&
    quote.original_variant?.quote_fingerprint === fingerprint &&
    [quote.variant?.total_price, quote.variant?.price_per_night, quote.promotion.discount_amount]
      .every(n => typeof n === 'number' && Number.isFinite(n) && n >= 0);
}

export function couponPreviewUnavailable(
  room: { is_published: boolean; room_categories: { is_active: boolean } | null },
  variant: { meal_plan_code: string; cancellation_policy_code: string; quote_fingerprint?: string },
  websiteVariants: { meal_plan_code: string; cancellation_policy_code: string; quote_fingerprint?: string }[],
) {
  if (!room.is_published) return 'This room type is unpublished; website coupons are not applicable.';
  if (room.room_categories?.is_active === false) return 'This category is inactive; website coupons are not applicable.';
  const available = websiteVariants.find(v => v.meal_plan_code === variant.meal_plan_code && v.cancellation_policy_code === variant.cancellation_policy_code);
  if (!available) return 'This meal plan or cancellation policy is unavailable for website booking.';
  if (!available.quote_fingerprint || available.quote_fingerprint !== variant.quote_fingerprint) return 'The website rate has changed. Refresh to check again.';
  return null;
}