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