// One server-side adapter around the canonical database quote engine.
// Requests contain IDs and quantities only. Never accept client meal/room/addon prices.
export class QuoteError extends Error {
  code: string; status: number;
  constructor(code: string, message: string, status = 409) { super(message); this.code = code; this.status = status; }
}
export const money = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function integer(value: unknown, label: string, minimum = 0, maximum = 100) {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < minimum || value > maximum) throw new QuoteError('INVALID_QUOTE', `${label} is invalid.`, 400);
  return value;
}
export function normalizeQuoteRequest(raw: any) {
  if (!raw || !UUID.test(raw.room_type_id || '') || (raw.room_unit_id && !UUID.test(raw.room_unit_id))) throw new QuoteError('INVALID_QUOTE', 'A valid room selection is required.', 400);
  const date = (value: unknown) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
  if (!date(raw.check_in) || !date(raw.check_out)) throw new QuoteError('INVALID_QUOTE', 'Valid stay dates are required.', 400);
  const nights = (Date.parse(raw.check_out) - Date.parse(raw.check_in)) / 86400000;
  integer(nights, 'Stay length', 1, 365);
  if (!['RO', 'BB', 'HB', 'FB'].includes(raw.meal_plan_code) || typeof raw.cancellation_policy_code !== 'string') throw new QuoteError('INVALID_QUOTE', 'Select a meal plan and cancellation policy.', 400);
  const adults_count = integer(raw.adults_count, 'Adults', 1);
  const children_count = integer(raw.children_count, 'Children');
  const infants_count = integer(raw.infants_count, 'Infants');
  if (!Array.isArray(raw.addons ?? [])) throw new QuoteError('INVALID_QUOTE', 'Invalid extras.', 400);
  const seen = new Set<string>();
  const addons = (raw.addons ?? []).map((item: any) => {
    if (!item || !['meal', 'activity', 'spa', 'transport', 'bedding'].includes(item.type) || typeof item.id !== 'string') throw new QuoteError('INVALID_QUOTE', 'Invalid extra selection.', 400);
    const key = `${item.type}:${item.id}`;
    if (seen.has(key)) throw new QuoteError('INVALID_QUOTE', 'Duplicate extras must use a single quantity.', 400);
    seen.add(key);
    return { type: item.type, id: item.id, quantity: integer(item.quantity, 'Extra quantity', 1, 99) };
  }).sort((a: any, b: any) => `${a.type}:${a.id}`.localeCompare(`${b.type}:${b.id}`));
  if (addons.length > 100) throw new QuoteError('INVALID_QUOTE', 'Too many extras.', 400);
  return { room_type_id: raw.room_type_id, room_unit_id: raw.room_unit_id || null, check_in: raw.check_in, check_out: raw.check_out, adults_count, children_count, infants_count, meal_plan_code: raw.meal_plan_code, cancellation_policy_code: raw.cancellation_policy_code, addons };
}

// Preserve the existing published bedding/fallback transfer tariffs, but validate
// them on the server too. They are not meal supplements or editable request prices.
const BEDDING: Record<string, { title: string; price: number }> = {
  'extra-bed-1': { title: 'Extra Bed', price: 500 },
  'extra-mattress-1': { title: 'Extra Mattress', price: 300 },
  'baby-crib-1': { title: 'Baby Crib', price: 200 },
};
const FALLBACK_TRANSPORT: Record<string, number> = {
  'pickup-mumbai-sedan': 4000, 'pickup-mumbai-suv': 5000, 'pickup-pune-sedan': 2500, 'pickup-pune-suv': 3000,
  'drop-mumbai-sedan': 4000, 'drop-mumbai-suv': 5000, 'drop-pune-sedan': 2500, 'drop-pune-suv': 3000,
  'twoway-mumbai-sedan': 7500, 'twoway-mumbai-suv': 9500, 'twoway-pune-sedan': 4500, 'twoway-pune-suv': 5500,
};

export async function calculateBookingQuote(db: any, raw: any, mode: 'website' | 'manual' = 'website') {
  const request = normalizeQuoteRequest(raw);
  const { data: room, error: roomError } = await db.from('room_types').select('id,is_published,base_price').eq('id', request.room_type_id).maybeSingle();
  if (roomError) throw new QuoteError('QUOTE_LOOKUP_FAILED', 'Room could not be verified.', 503);
  if (!room || (mode === 'website' && room.is_published !== true)) throw new QuoteError('ROOM_TYPE_NOT_PUBLISHED', 'This room is not available for website booking.');
  if (request.room_unit_id) {
    const { data: unit, error } = await db.from('room_units').select('id,room_type_id,is_active,status').eq('id', request.room_unit_id).maybeSingle();
    if (error || !unit || unit.room_type_id !== room.id || !unit.is_active || (unit.status === 'maintenance' || (unit.status === 'management_block' || unit.status === 'reserved'))) throw new QuoteError('ROOM_SELECTION_MISMATCH', 'The selected room unit is unavailable.');
  }
  const { data: variants, error } = await db.rpc(mode === 'website' ? 'calculate_website_rate_variants' : 'calculate_rate_variants_v2', {
    p_room_type_id: request.room_type_id, p_room_unit_id: request.room_unit_id,
    p_check_in: request.check_in, p_check_out: request.check_out,
    p_adults_count: request.adults_count, p_children_count: request.children_count, p_infants_count: request.infants_count,
    p_booking_channel: 'direct',
  });
  if (mode === 'website' && error?.code === 'P0001' && error.message?.startsWith('MEAL_PLAN_UNAVAILABLE')) throw new QuoteError('MEAL_PLAN_UNAVAILABLE', 'This meal plan is no longer available for the selected room and stay. Please choose an available plan.');
  if (error) throw new QuoteError('QUOTE_LOOKUP_FAILED', 'The rate could not be calculated. Please refresh.', 503);
  if (mode === 'website' && Array.isArray(variants) && !variants.some(v => v.meal_plan_code === request.meal_plan_code)) throw new QuoteError('MEAL_PLAN_UNAVAILABLE', 'This meal plan is no longer available for the selected room and stay. Please choose an available plan.');
  let variant = Array.isArray(variants) ? variants.find(v => v.meal_plan_code === request.meal_plan_code && v.cancellation_policy_code === request.cancellation_policy_code) : null;
  if (!variant || !['verified', 'legacy_basis_unverified'].includes(variant.pricing_status) || !variant.quote_fingerprint) throw new QuoteError('RATE_BASIS_UNVERIFIED', 'A server-verified rate is required before booking.');
  if (!Number.isFinite(Number(variant.total_price)) || Number(variant.total_price) < 0) throw new QuoteError('INVALID_QUOTE', 'Invalid calculated room price.');

  if (mode === 'manual' && variant.pricing_status === 'legacy_basis_unverified') {
    const nights = (Date.parse(request.check_out) - Date.parse(request.check_in)) / 86400000;
    const legacyTotal = money(Number(room.base_price) * nights);
    variant = { ...variant, room_rate: legacyTotal, meal_cost: 0, policy_adjustment: 0,
      total_price: legacyTotal, price_per_night: Number(room.base_price),
      pricing_status: 'legacy_manual_basis_unverified',
      quote_fingerprint: `${variant.quote_fingerprint}:manual-base:${room.base_price}`,
    };
  }

  const extras = [];
  for (const selection of request.addons) {
    let item: any;
    if (selection.type === 'bedding') {
      item = BEDDING[selection.id];
    } else if (selection.type === 'transport' && FALLBACK_TRANSPORT[selection.id] !== undefined) {
      const { data: active, error: transportError } = await db.from('addons').select('id').eq('category', 'transport').eq('is_active', true).limit(1);
      if (transportError || active?.length) throw new QuoteError('EXTRA_CHANGED', 'Transfer options have changed. Please select your transfer again.');
      item = { title: selection.id, price: FALLBACK_TRANSPORT[selection.id] };
    } else {
      if (!UUID.test(selection.id)) throw new QuoteError('EXTRA_UNAVAILABLE', 'An extra is no longer available.');
      const table = { meal: 'meals', activity: 'activities', spa: 'spa_services', transport: 'addons' }[selection.type as string];
      const { data, error: itemError } = await db.from(table).select('*').eq('id', selection.id).eq('is_active', true).maybeSingle();
      if (itemError) throw new QuoteError('QUOTE_LOOKUP_FAILED', 'Extras could not be verified.', 503);
      if (data) {
        // Do not automatically charge for an included buffet a second time.
        if (variant.pricing_status === 'verified' && selection.type === 'meal' && variant.included_meals?.includes(data.meal_type) && /buffet/i.test(data.title ?? '')) throw new QuoteError('MEAL_ALREADY_INCLUDED', 'This buffet meal is already included in the chosen plan. Remove the duplicate extra.');
        if (selection.type === 'transport' && data.category !== 'transport') throw new QuoteError('EXTRA_UNAVAILABLE', 'Invalid transfer selection.');
        item = { ...data, title: data.title ?? data.name, price: selection.type === 'activity' ? data.price_amount : data.price };
      }
    }
    if (!item || !Number.isFinite(Number(item.price)) || Number(item.price) < 0) throw new QuoteError('EXTRA_UNAVAILABLE', 'An extra is no longer available.');
    extras.push({ ...selection, title: item.title, price: Number(item.price), total: money(Number(item.price) * selection.quantity) });
  }
  const addon_total = money(extras.reduce((sum, x) => sum + x.total, 0));
  const subtotal = money(Number(variant.total_price) + addon_total);
  let tax_rate = 0.18;
  if (mode === 'website') {
    const { data: tiers, error: taxError } = await db.from('gst_tiers').select('*').eq('is_active', true).order('display_order');
    if (taxError) throw new QuoteError('QUOTE_LOOKUP_FAILED', 'Tax configuration could not be verified.', 503);
    const tier = tiers?.find((t: any) => Number(variant.price_per_night) >= Number(t.min_amount) && (t.max_amount === null || Number(variant.price_per_night) <= Number(t.max_amount)));
    if (tier) tax_rate = Number(tier.gst_percentage) / 100;
  }
  // Preserve existing web-tier/manual-18% tax policy until separately approved.
  const tax_amount = money(subtotal * tax_rate);
  const total_amount = money(subtotal + tax_amount);
  const snapshot = { version: 1, request, variant, extras, addon_total, subtotal, tax_rate, tax_amount, total_amount, currency: 'INR', tax_mode: mode };
  return snapshot;
}

export function assertQuoteMatches(quote: any, expectedAmount: unknown, expectedFingerprint: unknown) {
  if (typeof expectedAmount !== 'number' || !Number.isFinite(expectedAmount) || Math.abs(money(expectedAmount) - quote.total_amount) > 0.01 || expectedFingerprint !== quote.variant.quote_fingerprint) {
    throw new QuoteError('QUOTE_CHANGED', 'Your price has changed. Refresh the quote and review it before paying.');
  }
}

export function snapshotBookingFields(snapshot: any) {
  const r = snapshot.request;
  return {
    room_type_id: r.room_type_id, room_unit_id: r.room_unit_id, check_in: r.check_in, check_out: r.check_out,
    guests_count: r.adults_count + r.children_count + r.infants_count,
    meal_plan_code: r.meal_plan_code, cancellation_policy_code: r.cancellation_policy_code,
    room_cost: snapshot.variant.room_rate, meal_cost: snapshot.variant.meal_cost,
    total_amount: snapshot.total_amount,
    rate_breakdown: { ...snapshot.variant, adults_count: r.adults_count, children_count: r.children_count, infants_count: r.infants_count, validated_quote: snapshot },
    selected_meals: snapshot.extras.filter((x: any) => x.type === 'meal'),
    selected_activities: snapshot.extras.filter((x: any) => x.type === 'activity'),
    selected_spa_services: snapshot.extras.filter((x: any) => x.type === 'spa'),
    selected_bedding: snapshot.extras.filter((x: any) => x.type === 'bedding'),
  };
}
